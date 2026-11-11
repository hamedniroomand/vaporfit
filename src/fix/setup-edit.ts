import { parse } from '@vue/compiler-sfc';

import type { CompiledFile } from '#compiler/vue-compiler.ts';
import { childNodes, parseModule, statementsOf } from '#syntax/ast.ts';
import type { SyntaxNode } from '#syntax/ast.ts';
import type { ScriptFacts } from '#syntax/script.ts';

import type { GlobalUse } from './template-uses.ts';

export interface ManualCause {
  kind: 'manual';
  cause: 'name' | 'call';
  name: string;
}

export interface SetupScope {
  facts: ScriptFacts;
  bound: Set<string>;
  locals: Set<string>;
  compiled: CompiledFile;
}

interface CallTarget {
  expression: string;
  importLine: string | null;
}

export function spliceGlobals(
  source: string,
  filename: string,
  uses: GlobalUse[],
  lines: string[],
): string {
  const edits = uses.map(use => ({
    end: use.offset + use.global.length,
    start: use.offset,
    text: use.local,
  }));
  edits.push(scriptEdit(source, filename, lines));
  edits.sort((left, right) => right.start - left.start);
  let next = source;
  for (const edit of edits)
    next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`;
  return next;
}

export function i18nLines(names: readonly string[], scope: SetupScope): string[] | ManualCause {
  const { compiled } = scope;
  const end = semicolon(compiled);
  const target = callTarget(scope, { imported: 'useI18n', source: 'vue-i18n' }, end);
  if ('kind' in target) return target;
  if (scriptCalls(compiled, target.expression))
    return { cause: 'call', kind: 'manual', name: target.expression };
  const lines: string[] = [];
  if (target.importLine !== null) lines.push(target.importLine, '');
  lines.push(`const { ${names.join(', ')} } = ${target.expression}()${end}`);
  return lines;
}

export function routerLines(names: readonly string[], scope: SetupScope): string[] | ManualCause {
  const { compiled } = scope;
  const end = semicolon(compiled);
  const imports: string[] = [];
  const statements: string[] = [];
  for (const name of names) {
    const imported = name === 'route' ? 'useRoute' : 'useRouter';
    const target = callTarget(scope, { imported, source: 'vue-router' }, end);
    if ('kind' in target) return target;
    if (scriptCalls(compiled, target.expression)) {
      return { cause: 'call', kind: 'manual', name: target.expression };
    }
    if (target.importLine !== null) imports.push(imported);
    statements.push(`const ${name} = ${target.expression}()${end}`);
  }
  const lines: string[] = [];
  if (imports.length > 0)
    lines.push(`import { ${imports.join(', ')} } from 'vue-router'${end}`, '');
  lines.push(...statements);
  return lines;
}

/** The expression that calls a composable. Uses an import of the file when it has one. */
function callTarget(
  scope: SetupScope,
  composable: { imported: string; source: string },
  end: string,
): CallTarget | ManualCause {
  const { bound, facts, locals } = scope;
  const { imported, source } = composable;
  const named = valueImport(facts, imported, source);
  if (named !== null) return { expression: named, importLine: null };
  const namespace = namespaceImport(facts, source);
  if (namespace !== null) return { expression: `${namespace}.${imported}`, importLine: null };
  if (bound.has(imported) || locals.has(imported))
    return { cause: 'name', kind: 'manual', name: imported };
  return { expression: imported, importLine: `import { ${imported} } from '${source}'${end}` };
}

function valueImport(facts: ScriptFacts, imported: string, source: string): string | null {
  const match = facts.imports.find(
    item =>
      item.kind === 'name' &&
      item.imported === imported &&
      item.source === source &&
      !item.typeOnly,
  );
  return match?.local ?? null;
}

function namespaceImport(facts: ScriptFacts, source: string): string | null {
  const match = facts.imports.find(
    item => item.kind === 'namespace' && item.source === source && !item.typeOnly,
  );
  return match?.local ?? null;
}

function scriptCalls(compiled: CompiledFile, expression: string): boolean {
  return [compiled.script, compiled.setup]
    .filter((block): block is { content: string; offset: number } => block !== null)
    .some(block => hasCall(parseModule(block.content, 'setup.ts').program, expression));
}

function hasCall(node: SyntaxNode, expression: string): boolean {
  if (node.type === 'CallExpression' && calleeText(node.callee) === expression) return true;
  return childNodes(node).some(child => hasCall(child, expression));
}

function calleeText(node: SyntaxNode | null | undefined): string | null {
  if (node === undefined || node === null) return null;
  if (node.type === 'Identifier') return node.name ?? null;
  if (node.type === 'MemberExpression' && node.computed !== true) {
    const objectName = node.object?.name;
    const propertyName = node.property?.name;
    if (objectName === undefined || propertyName === undefined) return null;
    return `${objectName}.${propertyName}`;
  }
  return null;
}

function semicolon(compiled: CompiledFile): string {
  const content = `${compiled.script?.content ?? ''}${compiled.setup?.content ?? ''}`;
  return content.includes(';') ? ';' : '';
}

function scriptEdit(
  source: string,
  filename: string,
  lines: string[],
): { start: number; end: number; text: string } {
  const kept = lines.filter((line, index) => line !== '' || index !== lines.length - 1);
  const body = `\n${kept.join('\n')}\n`;
  const parsed = parse(source, { filename, ignoreEmpty: false });
  const setup = parsed.descriptor.scriptSetup;
  if (setup === null) return { end: 0, start: 0, text: `<script setup>${body}</script>\n` };
  if (setup.content.trim().length === 0) {
    return { end: setup.loc.end.offset, start: setup.loc.start.offset, text: body };
  }
  const program = parseModule(setup.content, 'setup.ts').program;
  let importEnd = 0;
  for (const statement of statementsOf(program)) {
    if (statement.type !== 'ImportDeclaration') break;
    importEnd = statement.end;
  }
  const at = setup.loc.start.offset + importEnd;
  return { end: at, start: at, text: body };
}
