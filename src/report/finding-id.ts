import { createHash } from 'node:crypto';

import type { SourceLocation } from './types.ts';

/** A short id. It uses the file, the line, the column, and the rule. The message is not part of the id. */
export function findingId(finding: { rule: string; location: SourceLocation }): string {
  const { file, line, column } = finding.location;
  const key = `${finding.rule}\0${file}\0${line}\0${column}`;
  return `vf_${createHash('sha256').update(key).digest('hex').slice(0, 10)}`;
}
