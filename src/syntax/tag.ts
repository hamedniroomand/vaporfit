import type { TemplateNode, VueCompiler } from '#compiler/vue-compiler.ts';

import type { ResolvedBinding } from './binding.ts';
import { resolveBinding } from './binding.ts';
import { filled } from './filled.ts';
import type { ScriptFacts } from './script.ts';

export function resolveTag(
  node: TemplateNode,
  facts: ScriptFacts,
  compiler: VueCompiler,
): ResolvedBinding {
  const tag = node.tag ?? '';
  if (isElement(node, tag, compiler)) return { kind: 'element' };
  if (tag.includes('.')) return memberTag(tag, facts);
  return namedTag(tag, facts, compiler);
}

function isElement(node: TemplateNode, tag: string, compiler: VueCompiler): boolean {
  return (
    node.tagType === compiler.element.element ||
    compiler.isHTMLTag(tag) ||
    compiler.isSVGTag(tag) ||
    compiler.isMathMLTag(tag) ||
    compiler.isBuiltInTag(tag)
  );
}

function memberTag(tag: string, facts: ScriptFacts): ResolvedBinding {
  const [object, property] = tag.split('.');
  if (!filled(object) || !filled(property)) return { kind: 'unreadable' };
  const resolved = resolveBinding(object, facts);
  if (resolved.kind === 'namespace' && filled(resolved.source)) {
    return { imported: property, kind: 'import', source: resolved.source };
  }
  return { kind: 'unreadable' };
}

function namedTag(tag: string, facts: ScriptFacts, compiler: VueCompiler): ResolvedBinding {
  const names = [tag, compiler.capitalize(compiler.camelize(tag))];
  for (const name of names) {
    const resolved = resolveBinding(name, facts);
    if (resolved.kind === 'missing') continue;
    if (resolved.kind === 'import') return { ...resolved, imported: resolved.imported ?? name };
    return resolved;
  }
  return { kind: 'missing' };
}
