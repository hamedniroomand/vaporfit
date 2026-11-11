import { VaporfitError } from '#errors.ts';
import manifest from '#pkg' with { type: 'json' };

import { parseCli } from './args.ts';
import type { CliArgs } from './args.ts';
import { runCheck } from './check.ts';
import { helpText } from './help.ts';
import type { CliIo } from './io.ts';
import { serveReport } from './mcp.ts';
import { resolveRoot } from './root.ts';

export const exitCodes = { findings: 1, input: 2, ok: 0 } as const;

export function run(argv: string[], io: CliIo): number | Promise<number> {
  try {
    const result = execute(argv, io);
    return result instanceof Promise
      ? result.catch((error: unknown) => failInput(error, io))
      : result;
  } catch (error) {
    return failInput(error, io);
  }
}

function failInput(error: unknown, io: CliIo): number {
  if (!(error instanceof VaporfitError)) throw error;
  io.stderr(`vaporfit: ${error.message}\n`);
  return exitCodes.input;
}

function execute(argv: string[], io: CliIo): number | Promise<number> {
  const args = parseCli(argv);
  if (args.help) {
    io.stdout(helpText);
    return exitCodes.ok;
  }
  if (args.version) {
    io.stdout(`${manifest.version}\n`);
    return exitCodes.ok;
  }
  const root = resolveRoot(io.cwd, args.root);
  if (args.command === 'mcp') return serveReport(root, io);
  if (args.command === 'ui' || args.command === 'report') return startReport(args, root, io);
  return runCheck(args, root, io);
}

async function startReport(args: CliArgs, root: string, io: CliIo): Promise<number> {
  const module = await import('./ui.ts');
  return module.runUi(args, root, io);
}
