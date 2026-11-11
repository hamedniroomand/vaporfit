import { walkNodes } from './ast.ts';
import type { StaticImport, SyntaxNode } from './ast.ts';
import type { LocalValue } from './script.ts';

/** The names that one script block can see. An offset in the block starts at `base` in the SFC. */
export interface ScriptScope {
  imports: StaticImport[];
  locals: Map<string, LocalValue>;
  base: number;
}

export interface ScriptCalls {
  instanceCalls: number[];
  slotCalls: number[];
}

export function recordCalls(program: SyntaxNode, scope: ScriptScope): ScriptCalls {
  const calls: ScriptCalls = { instanceCalls: [], slotCalls: [] };
  walkNodes(program, node => {
    if (node.type !== 'CallExpression') return;
    const callee = unwrap(node.callee);
    noteDirectCall(callee, scope, calls);
    noteNamespaceCall(callee, scope, calls);
    noteSlotMember(callee, scope, calls);
  });
  return calls;
}

/** The import that a called name points to. An alias of an import counts. */
export function resolveCallee(
  name: string,
  scope: Pick<ScriptScope, 'imports' | 'locals'>,
): { imported: string; source: string } | null {
  const imported = scope.imports.find(item => item.local === name);
  if (imported !== undefined && imported.kind !== 'namespace') {
    return { imported: imported.imported, source: imported.source };
  }
  const local = scope.locals.get(name);
  if (local?.kind === 'alias') {
    const target = scope.imports.find(item => item.local === local.target);
    if (target !== undefined && target.kind !== 'namespace') {
      return { imported: target.imported, source: target.source };
    }
  }
  if (name === 'defineSlots') return { imported: 'defineSlots', source: 'vue' };
  return null;
}

function noteDirectCall(
  callee: SyntaxNode | undefined,
  scope: ScriptScope,
  calls: ScriptCalls,
): void {
  const calleeName = callee?.name;
  if (callee?.type !== 'Identifier' || calleeName === undefined || calleeName.length === 0) return;
  const resolved = resolveCallee(calleeName, scope);
  if (resolved?.source === 'vue' && resolved.imported === 'getCurrentInstance') {
    calls.instanceCalls.push(callee.start + scope.base);
  }
  if (scope.locals.get(calleeName)?.kind === 'slot-fn') {
    calls.slotCalls.push(callee.start + scope.base);
  }
}

/** `Vue.getCurrentInstance()` with `import * as Vue from 'vue'`. */
function noteNamespaceCall(
  callee: SyntaxNode | undefined,
  scope: ScriptScope,
  calls: ScriptCalls,
): void {
  if (callee?.type !== 'MemberExpression' || callee.computed === true) return;
  if (callee.object?.type !== 'Identifier' || callee.property?.name !== 'getCurrentInstance')
    return;
  const objectName = callee.object.name;
  const namespace = scope.imports.find(
    item => item.kind === 'namespace' && item.local === objectName,
  );
  if (namespace?.source === 'vue') calls.instanceCalls.push(callee.start + scope.base);
}

function noteSlotMember(
  callee: SyntaxNode | undefined,
  scope: ScriptScope,
  calls: ScriptCalls,
): void {
  const objectName = callee?.object?.name;
  if (callee?.type !== 'MemberExpression' || callee.object?.type !== 'Identifier') return;
  if (objectName !== undefined && scope.locals.get(objectName)?.kind === 'slots') {
    calls.slotCalls.push(callee.start + scope.base);
  }
}

function unwrap(node: SyntaxNode | undefined): SyntaxNode | undefined {
  if (node?.type === 'ChainExpression') return node.expression;
  return node;
}
