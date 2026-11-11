import type { Finding } from '#report/types.ts';
import type { ResolvedBinding } from '#syntax/binding.ts';
import { resolveBinding } from '#syntax/binding.ts';
import { filled } from '#syntax/filled.ts';
import type { TemplateFacts } from '#syntax/template.ts';

import type { FileContext } from './context.ts';
import { locate } from './context.ts';
import type { FeatureHit } from './features.ts';
import {
  directiveBinding,
  globalDirectiveHits,
  importedDirectiveHits,
  libraryForSource,
} from './features.ts';
import { hitFindings, toolFinding } from './findings.ts';
import { RULE, TEXT, unreadDirective } from './messages.ts';

type TemplateDirective = TemplateFacts['directives'][number];

export function directiveFindings(file: FileContext): Finding[] {
  const { compiler } = file.project;
  return file.template.directives
    .filter(directive => !compiler.isBuiltInDirective(directive.name))
    .flatMap(directive => oneDirective(file, directive));
}

function oneDirective(file: FileContext, directive: TemplateDirective): Finding[] {
  const { project } = file;
  const binding = directiveBinding(directive.name, project.compiler);
  const resolved = resolveBinding(binding, file.facts);
  const local = localDirective(file, directive, resolved);
  if (local !== null) return local;
  const hits = directiveHits(file, directive.name, resolved);
  if (hits.length > 0) return hitFindings(project, hits, directive.location);
  if (knownPackage(file, resolved)) return [];
  return [unknownDirective(file, directive, 'data')];
}

function localDirective(
  file: FileContext,
  directive: TemplateDirective,
  resolved: ResolvedBinding,
): Finding[] | null {
  if (resolved.kind === 'function' || resolved.kind === 'vapor') return [];
  if (resolved.kind === 'object') {
    return [
      toolFinding(file.project.data, {
        definition: locate(file, resolved.start ?? 0),
        level: 'error',
        location: directive.location,
        mark: 'script',
        message: TEXT.object,
        rule: RULE.object,
      }),
    ];
  }
  if (resolved.kind === 'local-file') return [unknownDirective(file, directive, 'file')];
  if (resolved.kind === 'unreadable' || resolved.kind === 'namespace') {
    return [unknownDirective(file, directive, 'value')];
  }
  return null;
}

function unknownDirective(
  file: FileContext,
  directive: TemplateDirective,
  reason: 'data' | 'file' | 'value',
): Finding {
  return toolFinding(file.project.data, {
    level: 'unknown',
    location: directive.location,
    mark: 'template',
    message: unreadDirective(directive.name, reason),
    rule: RULE.unknown,
  });
}

function knownPackage(file: FileContext, resolved: ResolvedBinding): boolean {
  if (resolved.kind !== 'import' || !filled(resolved.source)) return false;
  return libraryForSource(file.project.data, resolved.source) !== undefined;
}

function directiveHits(file: FileContext, name: string, resolved: ResolvedBinding): FeatureHit[] {
  const { data, installed } = file.project;
  if (resolved.kind === 'import' && filled(resolved.source) && filled(resolved.imported)) {
    return importedDirectiveHits(data, resolved.source, resolved.imported);
  }
  return globalDirectiveHits(data, installed, name);
}
