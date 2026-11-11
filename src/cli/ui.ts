import path from 'node:path';

import { loadHost } from '#devframe/load.ts';

import type { CliArgs } from './args.ts';
import type { CliIo } from './io.ts';

/** Starts the local UI or writes the static report. These commands do not use check exit codes. */
export async function runUi(args: CliArgs, root: string, io: CliIo): Promise<number> {
  const host = await loadHost();
  if (args.command === 'report') {
    const out = path.resolve(io.cwd, args.out ?? '');
    await host.writeReport(root, out);
    io.stdout(`Wrote the report to ${out}.\n`);
    return 0;
  }
  const server = await host.startUi(root, true);
  io.stdout(`The report is at ${server.origin}.\n`);
  return 0;
}
