import type { Finding } from '#report/types.ts';

import type { FileContext } from './context.ts';
import { locate } from './context.ts';
import { toolFinding } from './findings.ts';
import { RULE, TEXT } from './messages.ts';

export function callFindings(file: FileContext): Finding[] {
  const { data } = file.project;
  return [
    ...file.facts.instanceCalls.map(offset =>
      toolFinding(data, {
        level: 'unknown',
        location: locate(file, offset),
        mark: 'script',
        message: TEXT.instance,
        rule: RULE.instance,
      }),
    ),
    ...file.facts.slotCalls.map(offset =>
      toolFinding(data, {
        level: 'unknown',
        location: locate(file, offset),
        mark: 'script',
        message: TEXT.slot,
        rule: RULE.slot,
      }),
    ),
  ];
}
