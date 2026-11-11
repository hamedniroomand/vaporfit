import type { CompiledFile, TemplateNode, VueCompiler } from '#compiler/vue-compiler.ts';
import type { SourceLocation } from '#report/types.ts';

import { expressionRefAccess } from './access.ts';
import { forBindings, freeIdentifiers, patternNames } from './ast.ts';
import type { ResolvedBinding } from './binding.ts';
import { filled } from './filled.ts';
import type { ScriptFacts } from './script.ts';
import { resolveTag } from './tag.ts';

export type { ResolvedBinding } from './binding.ts';

export interface TemplateProp {
  name: string;
  location: SourceLocation;
  expression: string | null;
  value: string | null;
}

export interface TemplateSpread {
  expression: string;
  location: SourceLocation;
}

export interface TemplateComponent {
  tag: string;
  resolved: ResolvedBinding;
  imported: string;
  props: TemplateProp[];
  spreads: TemplateSpread[];
  ref: string | null;
  dynamic: boolean;
  root: boolean;
  location: SourceLocation;
}

export interface TemplateFacts {
  directives: { name: string; location: SourceLocation }[];
  memos: SourceLocation[];
  hooks: SourceLocation[];
  components: TemplateComponent[];
  names: { name: string; offset: number }[];
  refAccess: { ref: string; prop: string; start: number }[];
  unresolved: string[];
}

interface TemplateWalk {
  output: TemplateFacts;
  facts: ScriptFacts;
  compiler: VueCompiler;
  id: string;
}

interface ElementRead {
  node: TemplateNode;
  inner: Set<string>;
  /** Names in scope for the parent. A v-for source reads this scope. */
  outer: Set<string>;
  props: TemplateProp[];
  spreads: TemplateSpread[];
}

export function inspectTemplate(
  compiled: CompiledFile,
  facts: ScriptFacts,
  compiler: VueCompiler,
  id: string,
): TemplateFacts {
  const output = emptyFacts();
  if (compiled.template !== null) {
    walk(compiled.template, new Set(), { compiler, facts, id, output }, false);
  }
  output.unresolved = [...new Set(output.unresolved)].toSorted();
  return output;
}

function emptyFacts(): TemplateFacts {
  return {
    components: [],
    directives: [],
    hooks: [],
    memos: [],
    names: [],
    refAccess: [],
    unresolved: [],
  };
}

function walk(node: TemplateNode, scope: Set<string>, state: TemplateWalk, isRoot: boolean): void {
  const { compiler, output } = state;
  if (node.type === compiler.node.interpolation) {
    const expression = expressionOf(node);
    if (expression !== null) scan(expression.content, expression.offset, scope, output);
  }
  if (node.type !== compiler.node.element) {
    const elements = (node.children ?? []).filter(child => child.type === compiler.node.element);
    const only = elements.length === 1 ? elements[0] : undefined;
    for (const child of node.children ?? []) walk(child, scope, state, child === only);
    return;
  }
  const childScope = readElement(node, scope, state, isRoot);
  for (const child of node.children ?? []) walk(child, childScope, state, false);
}

function readElement(
  node: TemplateNode,
  scope: Set<string>,
  state: TemplateWalk,
  isRoot: boolean,
): Set<string> {
  const directives = (node.props ?? []).filter(prop => prop.type === state.compiler.node.directive);
  const forNames = namesOf(
    directives.find(prop => prop.name === 'for'),
    'for',
  );
  const slotNames = namesOf(
    directives.find(prop => prop.name === 'slot'),
    'slot',
  );
  const element: ElementRead = {
    inner: new Set([...scope, ...forNames]),
    node,
    outer: scope,
    props: [],
    spreads: [],
  };
  let refName: string | null = null;
  for (const prop of node.props ?? []) refName = readProp(prop, element, state) ?? refName;
  recordComponent(element, state, refName, isRoot);
  return new Set([...element.inner, ...slotNames]);
}

function namesOf(directive: TemplateNode | undefined, kind: 'for' | 'slot'): string[] {
  const expression = directive === undefined ? null : expressionOf(directive);
  if (expression === null) return [];
  if (kind === 'slot') return patternNames(expression.content);
  return forBindings(expression.content)?.names ?? [];
}

function readProp(prop: TemplateNode, element: ElementRead, state: TemplateWalk): string | null {
  const { compiler, id } = state;
  if (prop.type === compiler.node.attribute && filled(prop.name)) {
    if (prop.name === 'ref') return prop.value?.content ?? null;
    element.props.push({
      expression: null,
      location: point(id, prop),
      name: prop.name,
      value: prop.value?.content ?? null,
    });
    return null;
  }
  if (prop.type !== compiler.node.directive || !filled(prop.name)) return null;
  noteDirective(prop, element.node, state);
  return readDirective(prop, element, state);
}

function noteDirective(prop: TemplateNode, node: TemplateNode, state: TemplateWalk): void {
  const { compiler, output } = state;
  if (!filled(prop.name)) return;
  const location = point(state.id, prop);
  if (prop.name === 'memo') output.memos.push(location);
  if (
    prop.name === 'on' &&
    prop.arg?.isStatic === true &&
    prop.arg.content?.startsWith('vue:') === true &&
    node.tagType === compiler.element.element
  ) {
    output.hooks.push(location);
  }
  if (!compiler.isBuiltInDirective(prop.name))
    output.directives.push({ location, name: prop.name });
}

function readDirective(
  prop: TemplateNode,
  element: ElementRead,
  state: TemplateWalk,
): string | null {
  const { id, output } = state;
  if (prop.name === 'for') {
    scanFor(prop, element.outer, output);
    return null;
  }
  if (prop.name === 'slot') return null;
  if (prop.name === 'ref') return refFromExpression(expressionOf(prop)?.content ?? '');
  const expression = expressionOf(prop);
  const handlerScope = prop.name === 'on' ? new Set([...element.inner, '$event']) : element.inner;
  if (expression !== null) scan(expression.content, expression.offset, handlerScope, output);
  if (prop.name === 'bind' && filled(prop.arg?.content)) {
    element.props.push({
      expression: expression?.content ?? null,
      location: point(id, prop.arg),
      name: prop.arg.content,
      value: null,
    });
  }
  if (prop.name === 'bind' && !filled(prop.arg?.content) && expression !== null) {
    element.spreads.push({ expression: expression.content, location: point(id, prop) });
  }
  if (prop.arg?.isStatic === false && filled(prop.arg.content)) {
    scan(prop.arg.content, prop.arg.loc.start.offset, handlerScope, output);
  }
  return null;
}

function scanFor(prop: TemplateNode, scope: Set<string>, output: TemplateFacts): void {
  const full = expressionOf(prop);
  if (full === null) return;
  const parts = forBindings(full.content);
  if (parts === null) return;
  scan(parts.right, full.offset + Math.max(full.content.indexOf(parts.right), 0), scope, output);
}

function recordComponent(
  element: ElementRead,
  state: TemplateWalk,
  refName: string | null,
  isRoot: boolean,
): void {
  const { compiler, output } = state;
  const { node } = element;
  const resolved = resolveTag(node, state.facts, compiler);
  const tag = node.tag ?? '';
  const missing = resolved.kind === 'missing' || resolved.kind === 'unreadable';
  if (missing && node.tagType === compiler.element.component && filled(tag)) {
    output.unresolved.push(tag);
  }
  output.components.push({
    dynamic: tag.toLowerCase() === 'component',
    imported: resolved.imported ?? tag,
    location: point(state.id, node),
    props: element.props,
    ref: refName,
    resolved,
    root: isRoot,
    spreads: element.spreads,
    tag,
  });
}

export interface TemplateExpression {
  content: string;
  offset: number;
}

export function expressionOf(node: TemplateNode): TemplateExpression | null {
  const record = node as unknown as { exp?: unknown; content?: unknown };
  return readExpression(record.exp) ?? readExpression(record.content);
}

function readExpression(value: unknown): TemplateExpression | null {
  if (value === null || value === undefined || typeof value !== 'object') return null;
  const node = value as { content?: unknown; loc?: { start?: { offset?: number } } };
  if (typeof node.content === 'string' && typeof node.loc?.start?.offset === 'number') {
    return { content: node.content, offset: node.loc.start.offset };
  }
  if (typeof node.content === 'object' && node.content !== null)
    return readExpression(node.content);
  return null;
}

function scan(
  expression: string,
  offset: number,
  scope: ReadonlySet<string>,
  output: TemplateFacts,
): void {
  if (expression.trim().length === 0) return;
  for (const use of freeIdentifiers(expression, scope)) {
    if (use.start >= 0) output.names.push({ name: use.name, offset: offset + use.start });
  }
  for (const access of expressionRefAccess(expression, 'template')) {
    if (access.start >= 0) {
      output.refAccess.push({ prop: access.prop, ref: access.ref, start: offset + access.start });
    }
  }
}

function point(file: string, node: TemplateNode | null | undefined): SourceLocation {
  return {
    column: node?.loc.start.column ?? 1,
    file,
    line: node?.loc.start.line ?? 1,
  };
}

function refFromExpression(content: string): string | null {
  const ident = /^[A-Za-z_$][\w$]*$/u.exec(content.trim());
  if (ident?.[0] !== undefined) return ident[0];
  return /^['"]([A-Za-z_$][\w$]*)['"]$/u.exec(content.trim())?.[1] ?? null;
}
