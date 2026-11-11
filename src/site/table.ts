import { readdirSync } from 'node:fs';
import path from 'node:path';

import { buildDate, isStale } from '#data/freshness.ts';
import { loadData } from '#data/load.ts';
import type { DeclaredScope, Depth, Failure, Library, Tier } from '#data/types.ts';
import { VaporfitError } from '#errors.ts';

const LIBRARY_FILE_URL = 'https://github.com/hamedniroomand/vaporfit/blob/main/data/libraries/';

export interface TestedCell {
  depth: Depth;
  environment: string;
}

export interface BrokenCell {
  id: string;
  failure: Failure;
  issues: string[];
}

export type DeclaredCell =
  | { kind: 'none'; text: 'No declaration' }
  | { kind: 'statement'; scope: DeclaredScope; url: string; since: string | null };

export interface LibraryRow {
  package: string;
  file: string;
  version: string;
  date: string;
  stale: boolean;
  mark: 'stale' | null;
  declared: DeclaredCell;
  tested: TestedCell[];
  broken: BrokenCell[];
  editUrl: string;
}

export interface RuleRow {
  id: string;
  title: string;
  failure: Failure;
  tiers: Tier[];
  sources: string[];
}

export interface LibraryPage {
  rows: LibraryRow[];
  builtOn: string;
}

function declaredCell(declared: Library['declared']): DeclaredCell {
  if (declared === null) {
    return { kind: 'none', text: 'No declaration' };
  }
  return {
    kind: 'statement',
    scope: declared.scope,
    url: declared.url,
    since: declared.since,
  };
}

function testedCells(library: Library): TestedCell[] {
  const cells: TestedCell[] = [];
  for (const entry of library.interop.evidence) {
    if (entry.level === 'tested') {
      cells.push({ depth: entry.depth, environment: entry.environment });
    }
  }
  return cells;
}

function brokenCells(library: Library): BrokenCell[] {
  const cells: BrokenCell[] = [];
  for (const feature of library.features) {
    if (feature.status !== 'broken') {
      continue;
    }
    const issues: string[] = [];
    for (const entry of feature.evidence) {
      if (entry.level === 'issue') {
        issues.push(entry.url);
      }
    }
    cells.push({ id: feature.id, failure: feature.failure, issues });
  }
  return cells;
}

export function toLibraryRow(library: Library, file: string, today: string): LibraryRow {
  const stale = isStale(library.verified.date, today);
  return {
    package: library.package,
    file,
    version: library.verified.version,
    date: library.verified.date,
    stale,
    mark: stale ? 'stale' : null,
    declared: declaredCell(library.declared),
    tested: testedCells(library),
    broken: brokenCells(library),
    editUrl: `${LIBRARY_FILE_URL}${file}`,
  };
}

function libraryFileNames(dataDirectory: string): string[] {
  return readdirSync(path.join(dataDirectory, 'libraries'))
    .filter(name => name.endsWith('.json'))
    .toSorted();
}

/** loadData sorts the JSON file names. This list uses the same order. */
export function libraryRows(dataDirectory: string, today: string): LibraryRow[] {
  const { libraries } = loadData(dataDirectory);
  const files = libraryFileNames(dataDirectory);
  if (files.length !== libraries.length) {
    throw new VaporfitError(`${dataDirectory}: the library file count does not match`);
  }
  return libraries.map((library, index) => {
    const file = files[index];
    if (file === undefined) {
      throw new VaporfitError(`${dataDirectory}: a library file is missing`);
    }
    return toLibraryRow(library, file, today);
  });
}

/** Reads the library files and stamps the page with today. The default today is the build date. */
export function libraryPage(dataDirectory: string, today: string = buildDate()): LibraryPage {
  return {
    rows: libraryRows(dataDirectory, today),
    builtOn: today,
  };
}

export function ruleRows(dataDirectory: string): RuleRow[] {
  return loadData(dataDirectory).rules.map(rule => ({
    id: rule.id,
    title: rule.title,
    failure: rule.failure,
    tiers: [...rule.tiers],
    sources: [...rule.sources],
  }));
}
