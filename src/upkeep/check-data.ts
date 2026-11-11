import path from 'node:path';
import process from 'node:process';

import { loadData } from '#data/load.ts';

import { assertWorksHasEvidence } from './evidence.ts';
import { assertProbeFolders } from './probes.ts';

export function checkData(repoRoot: string): void {
  const dataDirectory = path.join(repoRoot, 'data');
  loadData(dataDirectory);
  assertWorksHasEvidence(dataDirectory);
  assertProbeFolders(dataDirectory, repoRoot);
}

function fail(error: unknown): void {
  const message = error instanceof Error ? error.message : 'the data check failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

export function runCheckData(): void {
  try {
    checkData(path.resolve(import.meta.dirname, '../..'));
    process.stdout.write('data checks passed\n');
  } catch (error) {
    fail(error);
  }
}
