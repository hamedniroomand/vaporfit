import type { VueCompiler } from '#compiler/vue-compiler.ts';
import { sameProp } from '#rules/features.ts';
import type { FileAnalysis } from '#rules/file.ts';
import { asNode, parseModule, statementsOf } from '#syntax/ast.ts';
import type { SyntaxNode } from '#syntax/ast.ts';
import type { ResolvedBinding } from '#syntax/binding.ts';
import { scriptBodies } from '#syntax/script.ts';
import type { TemplateComponent } from '#syntax/template.ts';

export interface ForwardHit {
  certainty: 'sure' | 'unsure';
  imported: string;
  resolved: ResolvedBinding;
}

type Certainty = 'sure' | 'unsure' | null;

interface ForwardCheck {
  prop: string;
  script: ForwardScript;
  declared: string[];
  compiler: VueCompiler;
}

export interface ForwardScript {
  forwards: Set<string>;
  inheritAttrs: boolean;
  inheritKnown: boolean;
  propsName: string | null;
}

export function forwardedProps(
  prop: string,
  file: Pick<FileAnalysis, 'bindings' | 'source' | 'template'>,
  compiler: VueCompiler,
): ForwardHit[] {
  const declared = Object.entries(file.bindings)
    .filter(([, kind]) => kind === 'props')
    .map(([name]) => name);
  const check: ForwardCheck = { compiler, declared, prop, script: readForwardScript(file.source) };
  const hits: ForwardHit[] = [];
  for (const component of file.template.components) {
    if (component.resolved.kind !== 'import' && component.resolved.kind !== 'local-file') continue;
    const certainty = certaintyFor(check, component);
    if (certainty === null) continue;
    hits.push({ certainty, imported: component.imported, resolved: component.resolved });
  }
  return hits;
}

function certaintyFor(check: ForwardCheck, component: TemplateComponent): Certainty {
  const { compiler, declared, prop, script } = check;
  const declaredKnown = declared.length > 0;
  const isDeclared = declared.some(name => sameProp(name, prop, compiler));
  let result: Certainty = null;
  for (const spread of component.spreads) {
    result = stronger(
      result,
      spreadCertainty(spread.expression.trim(), script, declaredKnown, isDeclared),
    );
  }
  for (const bound of component.props) {
    if (!sameProp(bound.name, prop, compiler)) continue;
    result = stronger(result, explicitCertainty(bound.expression, prop, script, compiler));
  }
  if (component.root && script.inheritAttrs) {
    result = stronger(result, fallthroughCertainty(script, declaredKnown, isDeclared));
  } else if (component.root && !script.inheritKnown) {
    result = stronger(result, 'unsure');
  }
  return result;
}

function spreadCertainty(
  expression: string,
  script: ForwardScript,
  declaredKnown: boolean,
  isDeclared: boolean,
): Certainty {
  const kind = spreadKind(expression, script);
  if (kind === 'other') return 'unsure';
  if (kind === 'props' || kind === 'forward') {
    if (!declaredKnown) return 'unsure';
    return isDeclared ? 'sure' : null;
  }
  if (script.propsName !== null && !declaredKnown) return 'unsure';
  return isDeclared ? null : 'sure';
}

function fallthroughCertainty(
  script: ForwardScript,
  declaredKnown: boolean,
  isDeclared: boolean,
): Certainty {
  if (!script.inheritKnown || (script.propsName !== null && !declaredKnown)) return 'unsure';
  return isDeclared ? null : 'sure';
}

function explicitCertainty(
  expression: string | null,
  prop: string,
  script: ForwardScript,
  compiler: VueCompiler,
): Certainty {
  if (expression === null) return null;
  const text = expression.trim();
  if (isConstant(text)) return null;
  const camel = compiler.camelize(prop);
  if (text === prop || text === camel) return 'sure';
  if (script.propsName !== null && memberOfProps(text, script.propsName, prop, camel))
    return 'sure';
  return 'unsure';
}

function memberOfProps(text: string, propsName: string, prop: string, camel: string): boolean {
  const members = [prop, camel].flatMap(name => [
    `${propsName}.${name}`,
    `${propsName}['${name}']`,
    `${propsName}["${name}"]`,
  ]);
  return members.includes(text);
}

function isConstant(text: string): boolean {
  return /^(?:true|false|null|undefined|\d+|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")$/u.test(text);
}

export function spreadKind(
  expression: string,
  script: ForwardScript,
): 'attrs' | 'forward' | 'other' | 'props' {
  if (!/^[A-Za-z_$][\w$]*$/u.test(expression)) return 'other';
  if (expression === '$attrs') return 'attrs';
  if (script.propsName !== null && expression === script.propsName) return 'props';
  return script.forwards.has(expression) ? 'forward' : 'other';
}

function stronger(current: Certainty, next: Certainty): Certainty {
  if (current === 'sure' || next === 'sure') return 'sure';
  if (current === 'unsure' || next === 'unsure') return 'unsure';
  return null;
}

export function readForwardScript(source: string): ForwardScript {
  const script: ForwardScript = {
    forwards: new Set(),
    inheritAttrs: true,
    inheritKnown: true,
    propsName: null,
  };
  const blocks = scriptBodies(source);
  const programs: SyntaxNode[] = [];
  for (const block of blocks) {
    try {
      programs.push(parseModule(block, 'forward.ts').program);
    } catch {
      script.inheritKnown = false;
    }
  }
  for (const program of programs) {
    const nodes = statementsOf(program);
    script.propsName ??= findPropsName(nodes);
    readOptions(nodes, script);
  }
  if (script.propsName === null) return script;
  for (const program of programs)
    collectForwards(statementsOf(program), script.propsName, script.forwards);
  return script;
}

function findPropsName(nodes: SyntaxNode[]): string | null {
  for (const declarator of declarators(nodes)) {
    const name = declarator.id?.type === 'Identifier' ? declarator.id.name : undefined;
    if (
      name !== undefined &&
      name.length > 0 &&
      declarator.init &&
      isDefineProps(declarator.init)
    ) {
      return name;
    }
  }
  return null;
}

function collectForwards(nodes: SyntaxNode[], propsName: string, forwards: Set<string>): void {
  const names = new Set([propsName]);
  for (const declarator of declarators(nodes)) {
    const name = declarator.id?.type === 'Identifier' ? declarator.id.name : undefined;
    if (name === undefined || name.length === 0 || !declarator.init) continue;
    if (!forwardsProps(declarator.init, names)) continue;
    forwards.add(name);
    names.add(name);
  }
}

function forwardsProps(init: SyntaxNode, names: Set<string>): boolean {
  if (init.type === 'Identifier' && init.name !== undefined) return names.has(init.name);
  if (init.type === 'ObjectExpression') {
    return (init.properties ?? []).some(property => {
      return property.type === 'SpreadElement' && names.has(property.argument?.name ?? '');
    });
  }
  if (init.type !== 'CallExpression') return false;
  const callee = init.callee?.name;
  if (callee !== 'useForwardProps' && callee !== 'useForwardPropsEmits') return false;
  const first = init.arguments?.[0];
  return first?.type === 'Identifier' && first.name !== undefined && names.has(first.name);
}

function isDefineProps(init: SyntaxNode): boolean {
  if (init.type !== 'CallExpression') return false;
  if (init.callee?.name === 'defineProps') return true;
  if (init.callee?.name !== 'withDefaults') return false;
  const first = init.arguments?.[0];
  return first?.type === 'CallExpression' && first.callee?.name === 'defineProps';
}

function readOptions(nodes: SyntaxNode[], script: ForwardScript): void {
  for (const node of nodes) {
    const call = optionsCall(node);
    if (call !== null) applyOptions(call, script);
    if (
      node.type === 'ExportDefaultDeclaration' &&
      node.declaration?.type === 'ObjectExpression' &&
      attrsFalse(node.declaration)
    ) {
      script.inheritAttrs = false;
    }
  }
}

function applyOptions(call: SyntaxNode, script: ForwardScript): void {
  const first = call.arguments?.[0];
  if (first?.type !== 'ObjectExpression') {
    script.inheritKnown = false;
    return;
  }
  if (attrsFalse(first)) script.inheritAttrs = false;
}

function optionsCall(node: SyntaxNode): SyntaxNode | null {
  const expression = node.type === 'ExpressionStatement' ? node.expression : undefined;
  if (expression?.type !== 'CallExpression' || expression.callee?.name !== 'defineOptions') {
    return null;
  }
  return expression;
}

function attrsFalse(object: SyntaxNode): boolean {
  for (const property of object.properties ?? []) {
    if (property.type !== 'Property' || property.computed === true) continue;
    const name =
      property.key?.name ?? (typeof property.key?.value === 'string' ? property.key.value : '');
    const child = asNode(property.value);
    if (name === 'inheritAttrs' && child?.type === 'Literal' && child.value === false) return true;
  }
  return false;
}

function declarators(nodes: SyntaxNode[]): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (const node of nodes) {
    if (node.type === 'VariableDeclaration') result.push(...(node.declarations ?? []));
    if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'VariableDeclaration'
    ) {
      result.push(...(node.declaration.declarations ?? []));
    }
  }
  return result;
}
