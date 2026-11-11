import { analyze } from '#analyze/analyze.ts';
import { applyFix, formatFix } from '#fix/fix.ts';
import { formatJson } from '#format/json.ts';
import { formatText } from '#format/text.ts';
import type { Report } from '#report/types.ts';

import type { CliArgs } from './args.ts';
import type { CliIo } from './io.ts';

export function runCheck(args: CliArgs, root: string, io: CliIo): number {
  const report = analyze(root);
  if (args.command === 'fix') {
    const result = applyFix(root, report, {
      i18n: args.i18n,
      router: args.router,
      write: args.write,
    });
    if (!args.json) io.stdout(formatFix(result));
  }
  if (args.json) io.stdout(formatJson(report));
  else if (args.command === 'check') io.stdout(formatText(report));
  return statusCode(report, args.strict);
}

function statusCode(report: Report, strict: boolean): number {
  if (report.project.interopPlugin.level === 'error') return 1;
  // Only the interop verdict sets the exit code. A pure-tier finding does not fail the run.
  for (const component of report.components) {
    if (component.interop === 'blocked' && (component.vapor || strict)) return 1;
  }
  return 0;
}
