import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { loadData } from '#data/load.ts';
import type { Library } from '#data/types.ts';
import { VaporfitError } from '#errors.ts';

export interface LibraryFile {
  file: string;
  library: Library;
}

export interface MissingProbe {
  file: string;
  probe: string;
}

/** Reads each library file. The file field is relative to the data directory. */
export function readLibraries(dataDirectory: string): LibraryFile[] {
  const folder = path.join(dataDirectory, 'libraries');
  const names = readdirSync(folder)
    .filter(name => name.endsWith('.json'))
    .toSorted();
  const { libraries } = loadData(dataDirectory);
  if (names.length !== libraries.length) {
    throw new VaporfitError(`${folder}: the loader count does not match the file count`);
  }
  return names.map((name, index) => {
    const library = libraries[index];
    if (library === undefined) throw new VaporfitError(`${name}: missing library`);
    return { file: path.join('libraries', name), library };
  });
}

/** Probe folders named by tested evidence. An empty probe is omitted. */
export function testedProbePaths(library: Library): string[] {
  const paths: string[] = [];
  const groups = [library.interop.evidence, ...library.features.map(feature => feature.evidence)];
  for (const group of groups) {
    for (const evidence of group) {
      if (evidence.level !== 'tested' || evidence.probe === null || evidence.probe.length === 0) {
        continue;
      }
      if (!paths.includes(evidence.probe)) paths.push(evidence.probe);
    }
  }
  return paths;
}

function folderInsideRepo(repoRoot: string, probe: string): boolean {
  const root = path.resolve(repoRoot);
  const folder = path.resolve(root, probe);
  const relative = path.relative(root, folder);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return false;
  return existsSync(folder) && statSync(folder).isDirectory();
}

function hasUnnamedTestedProbe(library: Library): boolean {
  const groups = [library.interop.evidence, ...library.features.map(feature => feature.evidence)];
  for (const group of groups) {
    for (const evidence of group) {
      if (evidence.level === 'tested' && (evidence.probe === null || evidence.probe.length === 0)) {
        return true;
      }
    }
  }
  return false;
}

export function missingProbeFolders(dataDirectory: string, repoRoot: string): MissingProbe[] {
  const missing: MissingProbe[] = [];
  const seen = new Set<string>();
  for (const row of readLibraries(dataDirectory)) {
    if (hasUnnamedTestedProbe(row.library)) missing.push({ file: row.file, probe: '' });
    for (const probe of testedProbePaths(row.library)) {
      const key = `${row.file}\0${probe}`;
      if (seen.has(key) || folderInsideRepo(repoRoot, probe)) continue;
      seen.add(key);
      missing.push({ file: row.file, probe });
    }
  }
  return missing;
}

export function assertProbeFolders(dataDirectory: string, repoRoot: string): void {
  const missing = missingProbeFolders(dataDirectory, repoRoot);
  if (missing.length === 0) return;
  const lines = missing.map(item =>
    item.probe.length === 0
      ? `${item.file}: tested evidence names no probe`
      : `${item.file}: missing probe folder ${item.probe}`,
  );
  throw new VaporfitError(lines.join('\n'));
}
