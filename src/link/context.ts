import path from 'node:path';

import { resolveLocal } from '#project/files.ts';
import type { Project } from '#project/project.ts';
import type { Registries } from '#project/registry.ts';
import { lookupTag } from '#project/registry.ts';
import type { TagTarget } from '#project/targets.ts';
import type { FileAnalysis } from '#rules/file.ts';
import type { ResolvedBinding } from '#syntax/binding.ts';
import { resolveBinding } from '#syntax/binding.ts';
import { filled } from '#syntax/filled.ts';
import type { TemplateComponent } from '#syntax/template.ts';

export interface LinkContext {
  project: Project;
  files: Map<string, FileAnalysis>;
  registries: Registries;
}

export function targetOfUse(
  link: LinkContext,
  file: FileAnalysis,
  component: TemplateComponent,
): TagTarget | null {
  const { resolved } = component;
  if (resolved.kind === 'import' && filled(resolved.source)) {
    return { imported: component.imported, kind: 'package', source: resolved.source };
  }
  if (resolved.kind === 'local-file') return localTarget(file, resolved);
  if (resolved.kind !== 'missing') return null;
  return lookupTag(component.tag, link.registries, link.project.compiler);
}

export function localTarget(file: FileAnalysis, binding: ResolvedBinding): TagTarget | null {
  if (binding.kind !== 'local-file' || !filled(binding.source)) return null;
  const absolute = resolveLocal(path.dirname(file.absolute), binding.source);
  return absolute === null ? null : { file: absolute, kind: 'file' };
}

export function targetOfDynamicUse(
  link: LinkContext,
  file: FileAnalysis,
  component: TemplateComponent,
): TagTarget | null {
  const isProp = component.props.find(prop => prop.name === 'is');
  if (isProp === undefined) return null;
  if (isProp.value !== null && isProp.value.length > 0) {
    return targetOfTagName(link, file, isProp.value);
  }
  if (isProp.expression === null) return null;
  return targetOfExpression(link, file, isProp.expression);
}

/** The target of `:is="Name"` or `:is="'name'"`. Each other expression gives null. */
function targetOfExpression(
  link: LinkContext,
  file: FileAnalysis,
  expression: string,
): TagTarget | null {
  const text = expression.trim();
  const quoted = /^['"]([^'"]+)['"]$/u.exec(text);
  if (quoted?.[1] !== undefined) return targetOfTagName(link, file, quoted[1]);
  if (!/^[A-Za-z_$][\w$]*$/u.test(text)) return null;
  const binding = resolveBinding(text, file.facts);
  if (binding.kind === 'local-file' && filled(binding.source)) return localTarget(file, binding);
  if (binding.kind !== 'missing') return null;
  return lookupTag(text, link.registries, link.project.compiler);
}

function targetOfTagName(link: LinkContext, file: FileAnalysis, tag: string): TagTarget | null {
  const { compiler } = link.project;
  const names = [tag, compiler.capitalize(compiler.camelize(tag))];
  for (const name of names) {
    const binding = resolveBinding(name, file.facts);
    if (binding.kind === 'local-file' && filled(binding.source)) return localTarget(file, binding);
    if (binding.kind === 'import' && filled(binding.source)) {
      return { imported: binding.imported ?? name, kind: 'package', source: binding.source };
    }
  }
  return lookupTag(tag, link.registries, compiler);
}
