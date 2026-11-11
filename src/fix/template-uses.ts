import type { TemplateNode, VueCompiler } from '#compiler/vue-compiler.ts';
import { forBindings, patternNames, readFreeIdentifiers } from '#syntax/ast.ts';
import { expressionOf } from '#syntax/template.ts';
import type { TemplateExpression } from '#syntax/template.ts';

export interface GlobalUse {
  global: string;
  local: string;
  offset: number;
}

export interface GlobalScan {
  locals: Set<string>;
  /** An expression that the tool cannot parse mentions a global name. */
  unreadable: boolean;
  /** A slot pattern or a v-for expression has a global name that the tool cannot replace. */
  unsafe: boolean;
  uses: GlobalUse[];
}

interface ScanState {
  output: GlobalScan;
  compiler: VueCompiler;
  globals: Map<string, string>;
}

export function scanGlobals(
  template: TemplateNode,
  compiler: VueCompiler,
  globals: Map<string, string>,
): GlobalScan {
  const output: GlobalScan = { locals: new Set(), unreadable: false, unsafe: false, uses: [] };
  walk(template, new Set(), { compiler, globals, output });
  return output;
}

export function textHasGlobal(source: string, globals: Map<string, string>): boolean {
  return [...globals.keys()].some(name => source.includes(name));
}

function walk(node: TemplateNode, scope: Set<string>, state: ScanState): void {
  const { compiler } = state;
  if (node.type === compiler.node.interpolation) {
    const expression = expressionOf(node);
    if (expression !== null) collect(expression, scope, state);
  }
  if (node.type !== compiler.node.element) {
    for (const child of node.children ?? []) walk(child, scope, state);
    return;
  }
  const childScope = readElement(node, scope, state);
  for (const child of node.children ?? []) walk(child, childScope, state);
}

function readElement(node: TemplateNode, scope: Set<string>, state: ScanState): Set<string> {
  const directives = (node.props ?? []).filter(prop => prop.type === state.compiler.node.directive);
  const forNames = bindingNames(
    directives.find(prop => prop.name === 'for'),
    'for',
  );
  const slotDirective = directives.find(prop => prop.name === 'slot');
  const slotNames = bindingNames(slotDirective, 'slot');
  for (const name of [...forNames, ...slotNames]) state.output.locals.add(name);
  noteSlot(slotDirective, scope, state);
  const inner = new Set([...scope, ...forNames]);
  for (const prop of node.props ?? []) readProp(prop, { inner, outer: scope }, state);
  return new Set([...inner, ...slotNames]);
}

function bindingNames(directive: TemplateNode | undefined, kind: 'for' | 'slot'): string[] {
  const expression = directive === undefined ? null : expressionOf(directive);
  if (expression === null) return [];
  if (kind === 'slot') return patternNames(expression.content);
  return forBindings(expression.content)?.names ?? [];
}

/** A default value in a slot pattern can read a global name. The tool does not change it. */
function noteSlot(directive: TemplateNode | undefined, scope: Set<string>, state: ScanState): void {
  const expression = directive === undefined ? null : expressionOf(directive);
  if (expression === null) return;
  const uses = readFreeIdentifiers(expression.content, scope);
  if (uses === null) {
    if (mentionsTarget(expression.content, state.globals)) state.output.unreadable = true;
    return;
  }
  if (uses.some(use => state.globals.has(use.name))) state.output.unsafe = true;
}

function readProp(
  prop: TemplateNode,
  scopes: { inner: Set<string>; outer: Set<string> },
  state: ScanState,
): void {
  if (prop.type !== state.compiler.node.directive || prop.name === undefined) return;
  if (prop.name === 'slot') return;
  if (prop.name === 'for') {
    scanFor(prop, scopes.outer, state);
    return;
  }
  const expression = expressionOf(prop);
  const handlerScope = prop.name === 'on' ? new Set([...scopes.inner, '$event']) : scopes.inner;
  if (expression !== null) collect(expression, handlerScope, state);
  if (
    prop.arg?.isStatic === false &&
    prop.arg.content !== undefined &&
    prop.arg.content.length > 0
  ) {
    collect({ content: prop.arg.content, offset: prop.arg.loc.start.offset }, handlerScope, state);
  }
}

function scanFor(prop: TemplateNode, scope: Set<string>, state: ScanState): void {
  const full = expressionOf(prop);
  if (full === null) return;
  const parts = forBindings(full.content);
  if (parts === null) {
    if (textHasGlobal(full.content, state.globals)) state.output.unsafe = true;
    return;
  }
  const index = full.content.indexOf(parts.right);
  collect({ content: parts.right, offset: full.offset + Math.max(index, 0) }, scope, state);
}

function collect(
  expression: TemplateExpression,
  scope: ReadonlySet<string>,
  state: ScanState,
): void {
  const { globals, output } = state;
  if (expression.content.trim().length === 0) return;
  const uses = readFreeIdentifiers(expression.content, scope);
  if (uses === null) {
    if (mentionsTarget(expression.content, globals)) output.unreadable = true;
    return;
  }
  for (const use of uses) {
    const local = globals.get(use.name);
    const at = expression.offset + use.start;
    if (local === undefined || use.start < 0 || output.uses.some(item => item.offset === at))
      continue;
    output.uses.push({ global: use.name, local, offset: at });
  }
}

function mentionsTarget(source: string, globals: Map<string, string>): boolean {
  for (const name of globals.keys()) {
    let from = 0;
    while (from < source.length) {
      const at = source.indexOf(name, from);
      if (at < 0) break;
      const before = at === 0 ? undefined : source[at - 1];
      const after = source[at + name.length];
      if (!identifierChar(before) && !identifierChar(after)) return true;
      from = at + name.length;
    }
  }
  return false;
}

function identifierChar(char: string | undefined): boolean {
  return char !== undefined && /[$\w]/u.test(char);
}
