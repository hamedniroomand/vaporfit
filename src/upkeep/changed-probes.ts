import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLibraries, testedProbePaths } from './probes.ts';

function probeNameFromPath(file: string): string | null {
  const normalized = file.replaceAll('\\', '/');
  const match = /(?:^|\/)repros\/([^/]+)(?:\/|$)/u.exec(normalized);
  return match?.[1] ?? null;
}

export function changedProbeNames(repoRoot: string, files: readonly string[]): string[] {
  const names = new Set<string>();
  const libraryNames = new Set(files.map(file => path.basename(file)));
  for (const row of readLibraries(path.join(repoRoot, 'data'))) {
    if (!libraryNames.has(path.basename(row.file))) continue;
    for (const probe of testedProbePaths(row.library)) names.add(path.basename(probe));
  }
  for (const file of files) {
    const name = probeNameFromPath(file);
    if (name !== null) names.add(name);
  }
  return [...names]
    .filter(name => existsSync(path.join(repoRoot, 'repros', name, 'probe.mjs')))
    .toSorted();
}

export function runChangedProbes(): void {
  const repoRoot = path.resolve(import.meta.dirname, '../..');
  const names = changedProbeNames(repoRoot, process.argv.slice(2));
  if (names.length === 0) return;
  process.stdout.write(`${names.join('\n')}\n`);
}
