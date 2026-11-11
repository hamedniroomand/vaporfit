import { moduleRefAccess } from './access.ts';
import { asNode, childNodes, isFunctionNode, parseModule, statementsOf } from './ast.ts';
import type { RefAccess, StaticImport, SyntaxNode } from './ast.ts';
import { recordCalls, resolveCallee } from './calls.ts';
import type { ScriptScope } from './calls.ts';

export type LocalValue =
  | { kind: 'alias'; target: string; start: number }
  | { kind: 'member'; object: string; property: string; start: number }
  | { kind: 'object'; start: number }
  | { kind: 'function'; start: number }
  | { kind: 'vapor'; start: number }
  | { kind: 'slots'; start: number }
  | { kind: 'slot-fn'; start: number }
  | { kind: 'unknown'; start: number };

export interface ScriptFacts {
  imports: StaticImport[];
  locals: Map<string, LocalValue>;
  instanceCalls: number[];
  slotCalls: number[];
  refAccess: RefAccess[];
}

function emptyFacts(): ScriptFacts {
  return { imports: [], instanceCalls: [], locals: new Map(), refAccess: [], slotCalls: [] };
}

export function scriptBodies(source: string): string[] {
  const bodies: string[] = [];
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/giu)) {
    const body = match[1];
    if (body !== undefined && body.trim().length > 0) bodies.push(body);
  }
  return bodies;
}

/** Reads one script block. Offsets in the result are absolute positions in the SFC. */
export function readScript(content: string, base: number): ScriptFacts {
  let parsed: ReturnType<typeof parseModule>;
  try {
    parsed = parseModule(content, 'script.ts');
  } catch {
    return emptyFacts();
  }
  const imports = parsed.imports
    .filter(item => !item.typeOnly)
    .map(item => ({
      imported: item.imported,
      kind: item.kind,
      local: item.local,
      source: item.source,
      start: item.start + base,
      typeOnly: item.typeOnly,
    }));
  const scope: ScriptScope = { base, imports, locals: new Map() };
  collectLocals(statementsOf(parsed.program), scope);
  const { instanceCalls, slotCalls } = recordCalls(parsed.program, scope);
  const refAccess = moduleRefAccess(parsed.program).map(access => ({
    prop: access.prop,
    ref: access.ref,
    start: access.start + base,
  }));
  return { imports, instanceCalls, locals: scope.locals, refAccess, slotCalls };
}

/** Joins the facts of `<script>` and `<script setup>`. A later local replaces an earlier one. */
export function mergeFacts(parts: ScriptFacts[]): ScriptFacts {
  const facts = emptyFacts();
  for (const part of parts) {
    facts.imports.push(...part.imports);
    facts.instanceCalls.push(...part.instanceCalls);
    facts.slotCalls.push(...part.slotCalls);
    facts.refAccess.push(...part.refAccess);
    for (const [name, value] of part.locals) facts.locals.set(name, value);
  }
  return facts;
}

function collectLocals(nodes: SyntaxNode[], scope: ScriptScope): void {
  for (const node of nodes) {
    const name = node.id?.name;
    if (node.type === 'FunctionDeclaration' && name !== undefined && name.length > 0) {
      scope.locals.set(name, {
        kind: 'function',
        start: (node.id?.start ?? node.start) + scope.base,
      });
    } else if (node.type === 'VariableDeclaration') {
      for (const declarator of node.declarations ?? []) readDeclarator(declarator, scope);
    } else if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration !== undefined &&
      node.declaration !== null
    ) {
      collectLocals([node.declaration], scope);
    } else if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration?.type === 'FunctionDeclaration'
    ) {
      collectLocals([node.declaration], scope);
    }
  }
}

function readDeclarator(declarator: SyntaxNode, scope: ScriptScope): void {
  const id = declarator.id;
  const init = declarator.init;
  if (id === undefined || id === null) return;
  if (
    id.type === 'ObjectPattern' &&
    init !== undefined &&
    init !== null &&
    isSlotsCall(init, scope)
  ) {
    readSlotFunctions(id, scope);
    return;
  }
  if (id.type !== 'Identifier' || id.name === undefined || id.name.length === 0) return;
  scope.locals.set(id.name, classifyInit(id, init, scope));
}

/** `const { default: render } = useSlots()`: each binding is a slot function. */
function readSlotFunctions(pattern: SyntaxNode, scope: ScriptScope): void {
  for (const property of pattern.properties ?? []) {
    const binding = property.type === 'RestElement' ? property.argument : asNode(property.value);
    if (binding?.type === 'Identifier' && binding.name !== undefined && binding.name.length > 0) {
      scope.locals.set(binding.name, { kind: 'slot-fn', start: binding.start + scope.base });
    }
  }
}

function classifyInit(
  id: SyntaxNode,
  init: SyntaxNode | null | undefined,
  scope: ScriptScope,
): LocalValue {
  const start = id.start + scope.base;
  if (init === undefined || init === null) return { kind: 'unknown', start };
  if (init.type === 'Identifier' && init.name !== undefined && init.name.length > 0) {
    return { kind: 'alias', start, target: init.name };
  }
  const objectName = init.object?.name;
  const propertyName = init.property?.name;
  if (
    init.type === 'MemberExpression' &&
    init.computed !== true &&
    objectName !== undefined &&
    objectName.length > 0 &&
    propertyName !== undefined &&
    propertyName.length > 0
  ) {
    return { kind: 'member', object: objectName, property: propertyName, start };
  }
  if (init.type === 'ObjectExpression') return { kind: 'object', start };
  if (init.type === 'FunctionExpression' || init.type === 'ArrowFunctionExpression') {
    return { kind: 'function', start };
  }
  if (isSlotsCall(init, scope)) return { kind: 'slots', start };
  const component = componentKind(init, scope);
  if (component !== null) return { kind: component, start };
  return { kind: 'unknown', start };
}

function componentKind(init: SyntaxNode, scope: ScriptScope): 'function' | 'vapor' | null {
  const calleeName = calledName(init);
  if (calleeName === null) return null;
  const resolved = resolveCallee(calleeName, scope);
  if (resolved?.source !== 'vue') return null;
  if (resolved.imported === 'defineVaporComponent') return 'vapor';
  if (resolved.imported === 'defineComponent' || resolved.imported === 'defineAsyncComponent') {
    return 'function';
  }
  return null;
}

function isSlotsCall(init: SyntaxNode, scope: ScriptScope): boolean {
  const calleeName = calledName(init);
  if (calleeName === null) return false;
  if (calleeName === 'defineSlots') return true;
  const resolved = resolveCallee(calleeName, scope);
  return resolved?.source === 'vue' && resolved.imported === 'useSlots';
}

function calledName(node: SyntaxNode): string | null {
  const name = node.callee?.name;
  if (node.type !== 'CallExpression' || node.callee?.type !== 'Identifier') return null;
  return name === undefined || name.length === 0 ? null : name;
}

export function topLevelAwait(content: string, base: number): number | null {
  try {
    const found = firstAwait(parseModule(content, 'setup.ts').program);
    return found === null ? null : found.start + base;
  } catch {
    return null;
  }
}

/** An await in a function is not a top-level await. */
function firstAwait(node: SyntaxNode): SyntaxNode | null {
  if (isFunctionNode(node)) return null;
  if (node.type === 'AwaitExpression') return node;
  for (const child of childNodes(node)) {
    const found = firstAwait(child);
    if (found !== null) return found;
  }
  return null;
}
