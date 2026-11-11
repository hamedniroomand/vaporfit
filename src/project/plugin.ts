import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { PluginState, SourceLocation } from '#report/types.ts';
import { childNodes, parseModule, statementsOf } from '#syntax/ast.ts';
import type { ParsedModule, SyntaxNode } from '#syntax/ast.ts';
import { locationAt } from '#syntax/position.ts';

import { readText } from './files.ts';
import { readNuxt } from './nuxt.ts';

/** File names of a Nuxt config, in the order that Nuxt reads them. */
export const NUXT_CONFIGS: readonly string[] = [
  'nuxt.config.ts',
  'nuxt.config.mts',
  'nuxt.config.js',
  'nuxt.config.mjs',
  'nuxt.config.cjs',
];
const ENTRY_CANDIDATES = [
  'src/main.ts',
  'src/main.tsx',
  'src/main.mts',
  'src/main.js',
  'src/main.mjs',
  'src/main.jsx',
  'main.ts',
  'main.js',
];

export interface PluginHit {
  state: PluginState;
  location: SourceLocation | null;
}

interface EntryFacts {
  file: string;
  source: string;
  parsed: ParsedModule;
  pluginLocals: Set<string>;
  namespaces: Set<string>;
  reexports: Set<string>;
}

/** A project with a Nuxt config. The pure tier is never ready for that project. */
export function nuxtProject(root: string): boolean {
  return NUXT_CONFIGS.some(name => existsSync(path.join(root, name)));
}

export function detectPlugin(root: string): PluginHit {
  const configs = NUXT_CONFIGS.map(name => path.join(root, name)).filter(file => existsSync(file));
  if (configs.length > 1) return { location: null, state: 'undetermined' };
  const config = configs[0];
  if (config !== undefined) return readNuxtFile(config);
  const entries = viteEntries(root);
  const entry = entries.length === 1 ? entries[0] : undefined;
  if (entry === undefined) return { location: null, state: 'undetermined' };
  return readEntry(entry);
}

function viteEntries(root: string): string[] {
  const htmlPath = path.join(root, 'index.html');
  if (!existsSync(htmlPath)) return conventionalEntries(root);
  const sources = moduleSources(readFileSync(htmlPath, 'utf8'))
    .map(source => resolveEntry(root, source))
    .filter((file): file is string => file !== null && existsSync(file));
  if (sources.length > 0) return sources;
  return conventionalEntries(root);
}

function conventionalEntries(root: string): string[] {
  return ENTRY_CANDIDATES.map(name => path.join(root, name)).filter(file => existsSync(file));
}

function moduleSources(html: string): string[] {
  const sources: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>/giu)) {
    const attrs = match[1] ?? '';
    if (!/\btype\s*=\s*["']module["']/iu.test(attrs)) continue;
    const src = /\bsrc\s*=\s*["']([^"']+)["']/iu.exec(attrs)?.[1];
    if (src !== undefined && src.length > 0) sources.push(src);
  }
  return sources;
}

function resolveEntry(root: string, source: string): string | null {
  if (source.startsWith('http://') || source.startsWith('https://')) return null;
  if (source.startsWith('/')) return path.join(root, source.slice(1));
  return path.resolve(root, source);
}

function readEntry(file: string): PluginHit {
  const source = readText(file);
  if (source === null) return { location: null, state: 'undetermined' };
  const parsed = parseEntry(source, file);
  if (parsed === null) return { location: null, state: 'undetermined' };
  const pluginLocals = new Set<string>();
  const namespaces = new Set<string>();
  const reexports = new Set<string>();
  for (const item of parsed.imports) {
    if (item.typeOnly) continue;
    if (item.source !== 'vue') {
      // The tool does not follow a re-export of the plugin from a different module.
      if (item.imported === 'vaporInteropPlugin' || item.local === 'vaporInteropPlugin')
        reexports.add(item.local);
      continue;
    }
    if (item.kind === 'namespace') namespaces.add(item.local);
    else if (item.imported === 'vaporInteropPlugin') pluginLocals.add(item.local);
  }
  followAlias(parsed.program, pluginLocals);
  return pluginState({ file, namespaces, parsed, pluginLocals, reexports, source });
}

function pluginState(entry: EntryFacts): PluginHit {
  const { file, namespaces, parsed, pluginLocals, reexports, source } = entry;
  const uses = useArguments(parsed.program);
  const plugin = uses.find(argument => isPluginArgument(argument, pluginLocals, namespaces));
  if (plugin !== undefined) {
    return { location: locationAt(file, source, plugin.start), state: 'installed' };
  }
  if (uses.some(argument => !isStaticArgument(argument, namespaces, reexports))) {
    return { location: locationAt(file, source, 0), state: 'undetermined' };
  }
  if (uses.length > 0 || hasCreateApp(parsed)) {
    return { location: locationAt(file, source, 0), state: 'not-installed' };
  }
  return { location: null, state: 'undetermined' };
}

function parseEntry(source: string, file: string): ParsedModule | null {
  try {
    return parseModule(source, file);
  } catch {
    return null;
  }
}

function hasCreateApp(parsed: ParsedModule): boolean {
  const names = new Set<string>(['createApp']);
  for (const item of parsed.imports) {
    if (item.source === 'vue' && item.imported === 'createApp') names.add(item.local);
  }
  return callsName(parsed.program, names);
}

function callsName(node: SyntaxNode, names: Set<string>): boolean {
  const callee = callCallee(node);
  const name = callee?.name;
  if (callee?.type === 'Identifier' && name !== undefined && names.has(name)) return true;
  return childNodes(node).some(child => callsName(child, names));
}

function useArguments(node: SyntaxNode): SyntaxNode[] {
  const found: SyntaxNode[] = [];
  collectUse(node, found);
  return found;
}

function collectUse(node: SyntaxNode, found: SyntaxNode[]): void {
  const callee = callCallee(node);
  const argument = node.arguments?.[0];
  if (
    node.type === 'CallExpression' &&
    callee?.type === 'MemberExpression' &&
    callee.computed !== true &&
    callee.property?.name === 'use' &&
    argument !== undefined
  ) {
    found.push(argument);
  }
  for (const child of childNodes(node)) collectUse(child, found);
}

function callCallee(node: SyntaxNode): SyntaxNode | undefined {
  if (node.type !== 'CallExpression') return undefined;
  if (node.callee?.type === 'ChainExpression') return node.callee.expression;
  return node.callee;
}

function isPluginArgument(node: SyntaxNode, locals: Set<string>, namespaces: Set<string>): boolean {
  if (node.type === 'Identifier' && node.name !== undefined && locals.has(node.name)) return true;
  return isNamespaceMember(node, namespaces, 'vaporInteropPlugin');
}

function isStaticArgument(
  node: SyntaxNode,
  namespaces: Set<string>,
  reexports: Set<string>,
): boolean {
  if (node.type === 'Identifier') return !reexports.has(node.name ?? '');
  return isNamespaceMember(node, namespaces);
}

function isNamespaceMember(node: SyntaxNode, namespaces: Set<string>, property?: string): boolean {
  const objectName = node.object?.name;
  if (node.type !== 'MemberExpression' || node.computed === true) return false;
  if (objectName === undefined || !namespaces.has(objectName)) return false;
  return property === undefined || node.property?.name === property;
}

function followAlias(program: SyntaxNode, names: Set<string>): void {
  for (const statement of statementsOf(program)) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declarations ?? []) addAlias(declarator, names);
  }
}

function addAlias(declarator: SyntaxNode, names: Set<string>): void {
  const id = declarator.id;
  const init = declarator.init;
  if (id?.type !== 'Identifier' || init?.type !== 'Identifier') return;
  if (id.name === undefined || init.name === undefined || !names.has(init.name)) return;
  names.add(id.name);
}

function readNuxtFile(file: string): PluginHit {
  const source = readText(file);
  if (source === null) return { location: null, state: 'undetermined' };
  const parsed = parseEntry(source, file);
  if (parsed === null) return { location: null, state: 'undetermined' };
  return readNuxt(file, source, parsed.program);
}
