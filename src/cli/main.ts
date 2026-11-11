#!/usr/bin/env node
import process from 'node:process';

import { processIo } from './io.ts';
import { run } from './run.ts';

try {
  process.exitCode = await run(process.argv.slice(2), processIo());
} catch (error) {
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${text}\n`);
  process.exitCode = 1;
}
