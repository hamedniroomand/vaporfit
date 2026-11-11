import { readFileSync } from 'node:fs';

import { getComponent } from '#index.ts';
import type { Finding, Report } from '#index.ts';

export function described(report: Report, id: string): string {
  const component = getComponent(report, id);
  return JSON.stringify(
    component?.findings.map(finding => ({
      column: finding.location.column,
      level: finding.level,
      line: finding.location.line,
      message: finding.message,
      rule: finding.rule,
    })),
  );
}

export function must(finding: Finding | undefined, detail: string): Finding {
  if (finding === undefined) throw new Error(detail);
  return finding;
}

export function textAt(file: string, finding: Finding, length: number): string {
  const source = readFileSync(file, 'utf8');
  const line = source.split('\n')[finding.location.line - 1] ?? '';
  return line.slice(finding.location.column - 1, finding.location.column - 1 + length);
}
