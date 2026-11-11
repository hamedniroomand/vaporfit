import { EXPRESSION_OFFSET, parseExpression, walkNodes } from './ast.ts';
import type { RefAccess, SyntaxNode } from './ast.ts';

const INSTANCE_PROPS = new Set(['$el', '$props', '$attrs', '$slots', '$refs']);

type AccessMode = 'template' | 'script';

interface NameChain {
  names: string[];
  start: number;
}

export function expressionRefAccess(expression: string, mode: AccessMode): RefAccess[] {
  const statement = parseExpression(expression);
  if (statement === null) return [];
  return collectAccess(statement, mode).map(access => ({
    prop: access.prop,
    ref: access.ref,
    start: access.start - EXPRESSION_OFFSET,
  }));
}

export function moduleRefAccess(program: SyntaxNode): RefAccess[] {
  return collectAccess(program, 'script');
}

function collectAccess(root: SyntaxNode, mode: AccessMode): RefAccess[] {
  const found: RefAccess[] = [];
  walkNodes(root, node => {
    if (node.type !== 'MemberExpression' && node.type !== 'ChainExpression') return;
    const access = chainToAccess(staticChain(node), mode);
    if (access !== null) found.push(access);
  });
  return found;
}

function staticChain(node: SyntaxNode): NameChain | null {
  if (node.type === 'ChainExpression' && node.expression !== undefined) {
    return staticChain(node.expression);
  }
  if (node.type === 'Identifier' && node.name !== undefined && node.name.length > 0) {
    return { names: [node.name], start: node.start };
  }
  return memberChain(node);
}

function memberChain(node: SyntaxNode): NameChain | null {
  const propertyName = node.property?.name;
  if (
    node.type !== 'MemberExpression' ||
    node.computed === true ||
    propertyName === undefined ||
    propertyName.length === 0 ||
    node.object === undefined
  ) {
    return null;
  }
  const head = staticChain(node.object);
  if (head === null) return null;
  return { names: [...head.names, propertyName], start: node.property?.start ?? head.start };
}

/** A template reads `name.$el`. A script reads `name.value.$el`. */
function chainToAccess(chain: NameChain | null, mode: AccessMode): RefAccess | null {
  if (chain === null) return null;
  const prop = chain.names.at(-1);
  const ref = chain.names[0];
  if (prop === undefined || !INSTANCE_PROPS.has(prop) || ref === undefined) return null;
  if (mode === 'template' && chain.names.length === 2) return { prop, ref, start: chain.start };
  if (mode === 'script' && chain.names.length === 3 && chain.names[1] === 'value') {
    return { prop, ref, start: chain.start };
  }
  return null;
}
