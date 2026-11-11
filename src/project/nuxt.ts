import type { PluginState, SourceLocation } from '#report/types.ts';
import { asNode, statementsOf } from '#syntax/ast.ts';
import type { SyntaxNode } from '#syntax/ast.ts';
import { locationAt } from '#syntax/position.ts';

export function readNuxt(
  file: string,
  source: string,
  program: SyntaxNode,
): { state: PluginState; location: SourceLocation | null } {
  const config = configObject(statementsOf(program), program);
  if (config === null) return { location: locationAt(file, source, 0), state: 'undetermined' };
  const vapor = vaporValue(config, program);
  if (vapor === null || (hasSpread(config) && vapor !== true)) {
    return { location: locationAt(file, source, config.start), state: 'undetermined' };
  }
  if (vapor) {
    const property = findProperty(config, 'vue');
    return {
      location: locationAt(file, source, property?.start ?? config.start),
      state: 'installed',
    };
  }
  return { location: locationAt(file, source, config.start), state: 'not-installed' };
}

function configObject(statements: SyntaxNode[], program: SyntaxNode): SyntaxNode | null {
  for (const statement of statements) {
    const declaration = exported(statement);
    if (declaration === null) continue;
    return objectFrom(declaration, program);
  }
  return null;
}

function exported(statement: SyntaxNode): SyntaxNode | null {
  if (statement.type !== 'ExportDefaultDeclaration') return null;
  return statement.declaration ?? null;
}

function objectFrom(declaration: SyntaxNode, program: SyntaxNode): SyntaxNode | null {
  if (declaration.type === 'ObjectExpression') return declaration;
  if (declaration.type === 'Identifier' && declaration.name !== undefined) {
    const init = localInit(program, declaration.name);
    return init?.type === 'ObjectExpression' ? init : null;
  }
  if (declaration.type !== 'CallExpression') return null;
  const argument = declaration.arguments?.[0];
  return argument?.type === 'ObjectExpression' ? argument : null;
}

/** `false`: the config has no `vue.vapor`. `null`: the tool cannot read the value. */
function vaporValue(config: SyntaxNode, program: SyntaxNode): boolean | null {
  const vue = findProperty(config, 'vue');
  if (vue === null) return false;
  const value = propertyValue(vue);
  if (value?.type !== 'ObjectExpression') return null;
  if (hasSpread(value)) return null;
  const vapor = findProperty(value, 'vapor');
  if (vapor === null) return false;
  return flagValue(propertyValue(vapor), program);
}

function flagValue(flag: SyntaxNode | null, program: SyntaxNode): boolean | null {
  if (flag === null) return null;
  if (flag.type === 'Literal' && typeof flag.value === 'boolean') return flag.value;
  return aliasFlag(flag, program);
}

function aliasFlag(flag: SyntaxNode, program: SyntaxNode): boolean | null {
  if (flag.type !== 'Identifier' || flag.name === undefined) return null;
  const init = localInit(program, flag.name);
  return init?.type === 'Literal' && typeof init.value === 'boolean' ? init.value : null;
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

function hasSpread(object: SyntaxNode): boolean {
  return (object.properties ?? []).some(property => property.type === 'SpreadElement');
}

function localInit(program: SyntaxNode, name: string): SyntaxNode | null {
  for (const statement of statementsOf(program)) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declarations ?? []) {
      if (declarator.id?.type === 'Identifier' && declarator.id.name === name) {
        return declarator.init ?? null;
      }
    }
  }
  return null;
}
