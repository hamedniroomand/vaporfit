import type { Finding } from '#report/types.ts';

import type { FileContext } from './context.ts';
import { locate } from './context.ts';
import type { SourceMark } from './findings.ts';
import { toolFinding } from './findings.ts';
import { RULE, TEXT } from './messages.ts';

/**
 * A read of `$el`, `$props`, `$attrs`, `$slots` or `$refs` through a template ref to a component
 * that this file defines. The link step finds the same read for a component in another file.
 */
export function localRefFindings(file: FileContext): Finding[] {
  const localRefs = new Set(
    file.template.components
      .filter(
        component => component.resolved.kind === 'object' || component.resolved.kind === 'function',
      )
      .map(component => component.ref)
      .filter((name): name is string => name !== null),
  );
  const read = (access: { ref: string; start: number }, mark: SourceMark): Finding[] => {
    if (!localRefs.has(access.ref)) return [];
    return [
      toolFinding(file.project.data, {
        level: 'error',
        location: locate(file, access.start),
        mark,
        message: TEXT.ref,
        rule: RULE.ref,
      }),
    ];
  };
  return [
    ...file.template.refAccess.flatMap(access => read(access, 'template')),
    ...file.facts.refAccess.flatMap(access => read(access, 'script')),
  ];
}
