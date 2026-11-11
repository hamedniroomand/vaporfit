import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

const src = path.join(import.meta.dirname, '../src');

/** The folders of `src/`, lowest first. The table in CONTRIBUTING.md has the same order. */
const LAYERS = [
  'data',
  'report',
  'compiler',
  'syntax',
  'project',
  'rules',
  'link',
  'analyze',
  'format',
  'fix',
  'devframe',
  'cli',
  'site',
  'upkeep',
];

function folderImports(folder: string): string[] {
  const targets = new Set<string>();
  const files = readdirSync(path.join(src, folder), { recursive: true, encoding: 'utf8' });
  for (const file of files.filter(name => name.endsWith('.ts'))) {
    const text = readFileSync(path.join(src, folder, file), 'utf8');
    for (const match of text.matchAll(/(?:from|import\()\s*'#([a-z-]+)\//gu)) {
      if (match[1] !== undefined && match[1] !== folder) targets.add(match[1]);
    }
  }
  return [...targets];
}

describe('source layout', () => {
  it('has a layer for each folder of src', () => {
    const folders = readdirSync(src, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      // Git does not keep an empty folder. A local one is not part of the layout.
      .filter(name => readdirSync(path.join(src, name)).length > 0);
    expect(folders.toSorted()).toEqual(LAYERS.toSorted());
  });

  it.each(LAYERS)('%s imports only from lower folders', folder => {
    const higher = folderImports(folder).filter(
      target => LAYERS.indexOf(target) > LAYERS.indexOf(folder),
    );
    expect(higher).toEqual([]);
  });
});
