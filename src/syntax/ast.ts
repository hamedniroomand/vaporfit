import { parseSync } from 'oxc-parser';
import type { ImportNameKind } from 'oxc-parser';

const EXPRESSION_PREFIX = 'void (';
/** Length of the text that `parseExpression` puts before the expression. */
export const EXPRESSION_OFFSET = EXPRESSION_PREFIX.length;

export interface SyntaxNode {
  type: string;
  start: number;
  end: number;
  name?: string;
  computed?: boolean;
  optional?: boolean;
  shorthand?: boolean;
  operator?: string;
  expression?: SyntaxNode;
  object?: SyntaxNode;
  property?: SyntaxNode;
  callee?: SyntaxNode;
  arguments?: SyntaxNode[];
  left?: SyntaxNode;
  right?: SyntaxNode;
  argument?: SyntaxNode;
  id?: SyntaxNode | null;
  init?: SyntaxNode | null;
  params?: SyntaxNode[];
  body?: SyntaxNode | SyntaxNode[];
  declarations?: SyntaxNode[];
  declaration?: SyntaxNode | null;
  properties?: SyntaxNode[];
  elements?: Array<SyntaxNode | null>;
  key?: SyntaxNode;
  literal?: SyntaxNode;
  value?: unknown;
  alternate?: SyntaxNode;
  consequent?: SyntaxNode;
  test?: SyntaxNode;
  tag?: SyntaxNode;
  quasi?: SyntaxNode;
  quasis?: SyntaxNode[];
  expressions?: SyntaxNode[];
  specifiers?: SyntaxNode[];
  local?: SyntaxNode;
  imported?: SyntaxNode;
  source?: SyntaxNode;
}

export interface NameUse {
  name: string;
  start: number;
}

export interface RefAccess {
  ref: string;
  prop: string;
  start: number;
}

export interface ParsedModule {
  program: SyntaxNode;
  imports: StaticImport[];
  errors: boolean;
}

export interface StaticImport {
  source: string;
  local: string;
  imported: string;
  kind: 'name' | 'default' | 'namespace';
  start: number;
  typeOnly: boolean;
}

export function asNode(value: unknown): SyntaxNode | null {
  return isNode(value) ? value : null;
}

function isNode(value: unknown): value is SyntaxNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    typeof (value as { start?: unknown }).start === 'number'
  );
}

export function childNodes(node: SyntaxNode): SyntaxNode[] {
  const nodes: SyntaxNode[] = [];
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) nodes.push(item);
    } else if (isNode(value)) nodes.push(value);
  }
  return nodes;
}

/** Calls `visit` for a node and for each node below it. A parent comes before its children. */
export function walkNodes(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  for (const child of childNodes(node)) walkNodes(child, visit);
}

export function statementsOf(program: SyntaxNode): SyntaxNode[] {
  return Array.isArray(program.body) ? program.body : [];
}

export function isFunctionNode(node: SyntaxNode): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Parses one expression. Returns the statement that holds the expression, or null when the text
 * is not one expression. Subtract `EXPRESSION_OFFSET` from a node offset to get the text offset.
 */
export function parseExpression(expression: string): SyntaxNode | null {
  const parsed = parseSync('expr.ts', `${EXPRESSION_PREFIX}${expression})`, {
    lang: 'ts',
    preserveParens: false,
    sourceType: 'module',
  });
  if (parsed.errors.length > 0) return null;
  return statementsOf(parsed.program as unknown as SyntaxNode)[0] ?? null;
}

export function parseModule(source: string, filename: string): ParsedModule {
  const parsed = parseSync(filename, source, {
    lang: 'ts',
    preserveParens: false,
    sourceType: 'module',
  });
  const program = parsed.program as unknown as SyntaxNode;
  const imports: StaticImport[] = [];
  for (const item of parsed.module.staticImports) {
    for (const entry of item.entries) {
      const kind = entry.importName.kind;
      imports.push({
        source: item.moduleRequest.value,
        local: entry.localName.value,
        imported: importedName(kind, entry.importName.name),
        kind: importKind(kind),
        start: entry.localName.start,
        typeOnly: entry.isType,
      });
    }
  }
  return { errors: parsed.errors.length > 0, imports, program };
}

function importedName(kind: ImportNameKind, name: string | null): string {
  if (kind === 'Default') return 'default';
  if (kind === 'NamespaceObject') return '*';
  return name ?? '';
}

function importKind(kind: ImportNameKind): StaticImport['kind'] {
  if (kind === 'Default') return 'default';
  if (kind === 'NamespaceObject') return 'namespace';
  return 'name';
}

export function forBindings(expression: string): { names: string[]; right: string } | null {
  const match = /^([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)$/u.exec(expression.trim());
  const leftText = match?.[1];
  if (leftText === undefined || leftText.length === 0 || match?.[2] === undefined) return null;
  let left = leftText.trim();
  if (left.startsWith('(') && left.endsWith(')')) left = left.slice(1, -1).trim();
  return { names: patternNames(left), right: match[2] };
}

export function patternNames(pattern: string): string[] {
  const parsed = parseSync('pattern.ts', `function __vf(${pattern}) {}`, {
    lang: 'ts',
    preserveParens: false,
    sourceType: 'module',
  });
  if (parsed.errors.length > 0) return [];
  const statement = (parsed.program as unknown as SyntaxNode).body as SyntaxNode[] | undefined;
  const fn = statement?.[0];
  if (fn?.type !== 'FunctionDeclaration') return [];
  const names: string[] = [];
  for (const param of fn.params ?? []) collectBindings(param, names);
  return names;
}

function collectBindings(node: SyntaxNode | null | undefined, names: string[]): void {
  if (node === null || node === undefined) return;
  if (node.type === 'Identifier' && node.name !== undefined && node.name.length > 0) {
    names.push(node.name);
    return;
  }
  if (node.type === 'AssignmentPattern') {
    collectBindings(node.left, names);
    return;
  }
  if (node.type === 'RestElement') {
    collectBindings(node.argument, names);
    return;
  }
  if (node.type === 'ObjectPattern') {
    for (const property of node.properties ?? []) {
      if (property.type === 'RestElement') collectBindings(property.argument, names);
      else collectBindings(asNode(property.value) ?? property.argument, names);
    }
    return;
  }
  if (node.type === 'ArrayPattern') {
    for (const element of node.elements ?? []) collectBindings(element, names);
  }
}

interface Slot {
  parent: SyntaxNode | null;
  key: string;
}

const ROOT_SLOT: Slot = { key: '', parent: null };

/** Free identifiers in one expression, or null when the text is not one expression. */
export function readFreeIdentifiers(
  expression: string,
  scope: ReadonlySet<string>,
): NameUse[] | null {
  const statement = parseExpression(expression);
  if (statement === null) return null;
  const uses: NameUse[] = [];
  visit(statement, new Set(scope), ROOT_SLOT, uses);
  return uses.map(use => ({ name: use.name, start: use.start - EXPRESSION_OFFSET }));
}

export function freeIdentifiers(expression: string, scope: ReadonlySet<string>): NameUse[] {
  return readFreeIdentifiers(expression, scope) ?? [];
}

function visit(value: unknown, scope: Set<string>, slot: Slot, uses: NameUse[]): void {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, scope, slot, uses);
    return;
  }
  if (!isNode(value)) return;
  if (value.type === 'Identifier') {
    if (isFreeIdentifier(value, scope, slot))
      uses.push({ name: value.name ?? '', start: value.start });
    return;
  }
  if (isFunctionNode(value)) {
    visitFunction(value, scope, uses);
    return;
  }
  if (value.type === 'MemberExpression') {
    visit(value.object, scope, { key: 'object', parent: value }, uses);
    if (value.computed === true)
      visit(value.property, scope, { key: 'property', parent: value }, uses);
    return;
  }
  if (value.type === 'Property') {
    if (value.computed === true) visit(value.key, scope, { key: 'key', parent: value }, uses);
    visit(value.value, scope, { key: 'value', parent: value }, uses);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'object' && child !== null)
      visit(child, scope, { key, parent: value }, uses);
  }
}

function isFreeIdentifier(node: SyntaxNode, scope: Set<string>, slot: Slot): boolean {
  const { key, parent } = slot;
  if (node.name === undefined || node.name.length === 0 || scope.has(node.name)) return false;
  if (parent?.type === 'MemberExpression' && key === 'property' && parent.computed !== true) {
    return false;
  }
  if (parent?.type === 'Property' && key === 'key' && parent.computed !== true) return false;
  if (key === 'id' && parent !== null && isFunctionNode(parent)) return false;
  return true;
}

function visitFunction(node: SyntaxNode, scope: Set<string>, uses: NameUse[]): void {
  const inner = new Set(scope);
  if (node.id?.name !== undefined && node.id.name.length > 0) inner.add(node.id.name);
  for (const param of node.params ?? []) {
    const names: string[] = [];
    collectBindings(param, names);
    for (const name of names) inner.add(name);
    if (param.type === 'AssignmentPattern')
      visit(param.right, scope, { key: 'right', parent: param }, uses);
  }
  visit(node.body, inner, { key: 'body', parent: node }, uses);
}
