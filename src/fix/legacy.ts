import { existsSync } from 'node:fs';
import path from 'node:path';

import { parse } from '@vue/compiler-sfc';

import { projectFiles, readText } from '#project/files.ts';
import { NUXT_CONFIGS } from '#project/plugin.ts';
import { asNode, childNodes, parseModule, statementsOf } from '#syntax/ast.ts';
import type { StaticImport, SyntaxNode } from '#syntax/ast.ts';

const SOURCE_EXT = new Set(['.vue', '.js', '.ts', '.mjs', '.mts', '.cjs', '.jsx', '.tsx']);

type Reading = 'false' | 'true' | 'missing' | 'unread';

/** `composition` only when every i18n setup the tool can read sets `legacy: false`. */
export function projectLegacy(root: string): 'composition' | 'manual' {
  const readings = [...nuxtReadings(root), ...sourceReadings(root)];
  if (readings.length === 0) return 'manual';
  if (readings.some(reading => reading !== 'false')) return 'manual';
  return 'composition';
}

function nuxtReadings(root: string): Reading[] {
  const configs = NUXT_CONFIGS.map(name => path.join(root, name)).filter(file => existsSync(file));
  if (configs.length > 1) return ['unread'];
  const config = configs[0];
  if (config === undefined) return [];
  const reading = nuxtLegacy(config);
  return reading === null ? [] : [reading];
}

function nuxtLegacy(file: string): Reading | null {
  const source = readText(file);
  if (source === null) return 'unread';
  const parsed = parseModule(source, file);
  const config = parsed.errors ? null : configObject(statementsOf(parsed.program));
  if (config === null) return source.includes('i18n') ? 'unread' : null;
  const property = findProperty(config, 'i18n');
  if (property === null) return null;
  return legacyOf(propertyValue(property), parsed.program);
}

function sourceReadings(root: string): Reading[] {
  const readings: Reading[] = [];
  const files = projectFiles(root, name => SOURCE_EXT.has(path.extname(name)));
  for (const file of files) readings.push(...fileReadings(file));
  return readings;
}

function fileReadings(file: string): Reading[] {
  const source = readText(file);
  if (source === null) return [];
  if (file.endsWith('.vue')) return vueReadings(source, file);
  return scriptReadings(source, file);
}

function vueReadings(source: string, file: string): Reading[] {
  let parsed: ReturnType<typeof parse>;
  try {
    parsed = parse(source, { filename: file, ignoreEmpty: false });
  } catch {
    return source.includes('createI18n') ? ['unread'] : [];
  }
  const blocks = [parsed.descriptor.script, parsed.descriptor.scriptSetup].filter(
    (block): block is NonNullable<typeof block> => block !== null,
  );
  const readings: Reading[] = [];
  for (const block of blocks) readings.push(...scriptReadings(block.content, file));
  return readings;
}

function scriptReadings(source: string, file: string): Reading[] {
  const parsed = parseModule(source, file);
  if (parsed.errors) return source.includes('createI18n') ? ['unread'] : [];
  const targets = i18nCallees(parsed.imports);
  if (targets.names.size === 0 && targets.namespaces.size === 0) return [];
  const readings: Reading[] = [];
  collectCalls(parsed.program, targets, parsed.program, readings);
  return readings;
}

function i18nCallees(imports: StaticImport[]): { names: Set<string>; namespaces: Set<string> } {
  const names = new Set<string>();
  const namespaces = new Set<string>();
  for (const item of imports) {
    if (item.typeOnly || item.source !== 'vue-i18n') continue;
    if (item.kind === 'namespace') namespaces.add(item.local);
    else if (item.imported === 'createI18n') names.add(item.local);
  }
  return { names, namespaces };
}

function collectCalls(
  node: SyntaxNode,
  targets: { names: Set<string>; namespaces: Set<string> },
  program: SyntaxNode,
  readings: Reading[],
): void {
  if (isCreateI18n(node, targets)) {
    const argument = node.arguments?.[0];
    readings.push(argument === undefined ? 'missing' : legacyOf(argument, program));
  }
  for (const child of childNodes(node)) collectCalls(child, targets, program, readings);
}

function isCreateI18n(
  node: SyntaxNode,
  targets: { names: Set<string>; namespaces: Set<string> },
): boolean {
  if (node.type !== 'CallExpression') return false;
  const callee = unwrap(node.callee);
  if (callee?.type === 'Identifier' && callee.name !== undefined)
    return targets.names.has(callee.name);
  if (callee?.type !== 'MemberExpression' || callee.computed === true) return false;
  return (
    callee.property?.name === 'createI18n' &&
    callee.object?.name !== undefined &&
    targets.namespaces.has(callee.object.name)
  );
}

/** A spread after `legacy` can replace the value, so that call is not readable. */
function legacyOf(node: SyntaxNode | null, program: SyntaxNode): Reading {
  const value = node === null ? null : resolveValue(unwrap(node), program, new Set());
  if (value === null) return 'unread';
  if (value.type !== 'ObjectExpression') return 'unread';
  const legacy = findProperty(value, 'legacy');
  const spreads = (value.properties ?? []).filter(property => property.type === 'SpreadElement');
  if (spreads.some(spread => legacy === null || spread.start > legacy.start)) return 'unread';
  if (legacy === null) return 'missing';
  const flag = booleanOf(propertyValue(legacy), program);
  if (flag === null) return 'unread';
  return flag ? 'true' : 'false';
}

function booleanOf(node: SyntaxNode | null, program: SyntaxNode): boolean | null {
  const value = node === null ? null : resolveValue(unwrap(node), program, new Set());
  if (value?.type === 'Literal' && typeof value.value === 'boolean') return value.value;
  return null;
}

function resolveValue(
  node: SyntaxNode | null,
  program: SyntaxNode,
  seen: Set<string>,
): SyntaxNode | null {
  if (node === null) return null;
  if (node.type !== 'Identifier' || node.name === undefined) return node;
  if (seen.has(node.name)) return null;
  seen.add(node.name);
  const init = localInit(program, node.name);
  return init === null ? null : resolveValue(unwrap(init), program, seen);
}

function configObject(statements: SyntaxNode[]): SyntaxNode | null {
  for (const statement of statements) {
    if (statement.type !== 'ExportDefaultDeclaration') continue;
    const declaration = statement.declaration;
    if (declaration === undefined || declaration === null) continue;
    return objectFrom(declaration, statements);
  }
  return null;
}

function objectFrom(declaration: SyntaxNode, statements: SyntaxNode[]): SyntaxNode | null {
  const value = unwrap(declaration);
  if (value === null) return null;
  if (value.type === 'ObjectExpression') return value;
  if (value.type === 'Identifier' && value.name !== undefined) {
    const init = localInitFrom(statements, value.name);
    return init?.type === 'ObjectExpression' ? init : null;
  }
  if (value.type !== 'CallExpression') return null;
  const argument = value.arguments?.[0];
  return argument?.type === 'ObjectExpression' ? argument : null;
}

function localInit(program: SyntaxNode, name: string): SyntaxNode | null {
  return localInitFrom(statementsOf(program), name);
}

function localInitFrom(statements: SyntaxNode[], name: string): SyntaxNode | null {
  for (const statement of statements) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declarations ?? []) {
      if (declarator.id?.type === 'Identifier' && declarator.id.name === name) {
        return declarator.init ?? null;
      }
    }
  }
  return null;
}

function findProperty(object: SyntaxNode, name: string): SyntaxNode | null {
  for (const property of object.properties ?? []) {
    if (property.type !== 'Property' || property.computed === true) continue;
    const key = property.key;
    if (key?.type === 'Identifier' && key.name === name) return property;
    if (key?.type === 'Literal' && key.value === name) return property;
  }
  return null;
}

function propertyValue(property: SyntaxNode): SyntaxNode | null {
  return asNode(property.value);
}

function unwrap(node: SyntaxNode | null | undefined): SyntaxNode | null {
  if (node === undefined || node === null) return null;
  if (
    (node.type === 'TSAsExpression' ||
      node.type === 'TSSatisfiesExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'ParenthesizedExpression' ||
      node.type === 'ChainExpression') &&
    node.expression !== undefined
  ) {
    return unwrap(node.expression);
  }
  return node;
}
