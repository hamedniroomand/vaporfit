import { parseArgs } from 'node:util';

import { VaporfitError } from '#errors.ts';

export interface CliArgs {
  command: 'check' | 'fix' | 'mcp' | 'ui' | 'report';
  i18n: boolean;
  json: boolean;
  router: boolean;
  strict: boolean;
  write: boolean;
  root: string | undefined;
  out: string | undefined;
  help: boolean;
  version: boolean;
}

interface ParsedFlags {
  help?: boolean;
  i18n?: boolean;
  json?: boolean;
  out?: string;
  root?: string;
  router?: boolean;
  strict?: boolean;
  version?: boolean;
  write?: boolean;
}

export function parseCli(argv: string[]): CliArgs {
  const parsed = readArgs(argv);
  return commandArgs(parsed.values, parsed.positionals);
}

function readArgs(argv: string[]): { positionals: string[]; values: ParsedFlags } {
  try {
    return parseArgs({
      allowPositionals: true,
      args: argv,
      options: {
        help: { short: 'h', type: 'boolean' },
        i18n: { type: 'boolean' },
        json: { type: 'boolean' },
        out: { type: 'string' },
        root: { type: 'string' },
        router: { type: 'boolean' },
        strict: { type: 'boolean' },
        version: { short: 'v', type: 'boolean' },
        write: { type: 'boolean' },
      },
      strict: true,
    });
  } catch (error) {
    throw new VaporfitError(error instanceof Error ? error.message : 'The input is not valid.');
  }
}

function commandArgs(values: ParsedFlags, positionals: string[]): CliArgs {
  const [command, ...extra] = positionals;
  if (extra.length > 0) throw new VaporfitError('The command takes no file argument.');
  assertCommand(command);
  const help = values.help === true || command === 'help';
  const name =
    command === 'fix' || command === 'mcp' || command === 'ui' || command === 'report'
      ? command
      : 'check';
  assertFixFlag(name, help, values.write === true, '--write');
  assertFixFlag(name, help, values.i18n === true, '--i18n');
  assertFixFlag(name, help, values.router === true, '--router');
  if (values.out !== undefined && name !== 'report' && !help) {
    throw new VaporfitError('--out is only for report.');
  }
  if ((name === 'ui' || name === 'report') && !help) {
    if (values.json === true) throw new VaporfitError('--json is only for check or fix.');
    if (values.strict === true) throw new VaporfitError('--strict is only for check.');
  }
  if (name === 'report' && values.out === undefined && !help) {
    throw new VaporfitError('Set --out to a directory.');
  }
  return {
    command: name,
    help,
    i18n: values.i18n === true,
    json: values.json === true,
    out: values.out,
    root: values.root,
    router: values.router === true,
    strict: values.strict === true,
    version: values.version === true,
    write: values.write === true,
  };
}

function assertCommand(command: string | undefined): void {
  if (
    command !== undefined &&
    command !== 'check' &&
    command !== 'fix' &&
    command !== 'mcp' &&
    command !== 'ui' &&
    command !== 'report' &&
    command !== 'help'
  ) {
    throw new VaporfitError(`Unknown command: ${command}.`);
  }
}

function assertFixFlag(name: string, help: boolean, enabled: boolean, flag: string): void {
  if (enabled && name !== 'fix' && !help) throw new VaporfitError(`${flag} is only for fix.`);
}
