import { readFileSync } from 'node:fs';
import path from 'node:path';

import { loadData } from '#data/load.ts';

/** The newest `verified.date` in the repository data. The report prints it as the data date. */
export function newestDataDate(): string {
  const dates = loadData(path.join(import.meta.dirname, '../data')).libraries.map(
    library => library.verified.date,
  );
  return dates.toSorted().at(-1) ?? '';
}

/** The `vue` pin in the package.json of a test project. A Vue bump changes it, so tests read it. */
export function vuePin(projectRoot: string): string {
  const manifest = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const version = manifest.dependencies?.vue;
  if (version === undefined) throw new Error(`${projectRoot}: no vue dependency`);
  return version;
}
