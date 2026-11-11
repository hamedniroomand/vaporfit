import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { assertProbeFolders, missingProbeFolders } from '#upkeep/probes.ts';

const dataDirectory = path.join(import.meta.dirname, '../../data');
const repoRoot = path.join(import.meta.dirname, '../..');

function evidenceByLevel(value: Record<string, unknown>, level: string): Record<string, unknown> {
  const groups: Record<string, unknown>[][] = [];
  const interop = value.interop as { evidence?: Record<string, unknown>[] };
  if (Array.isArray(interop.evidence)) groups.push(interop.evidence);
  const features = value.features as { evidence: Record<string, unknown>[] }[] | undefined;
  if (Array.isArray(features)) {
    for (const feature of features) groups.push(feature.evidence);
  }
  for (const group of groups) {
    const item = group.find(entry => entry.level === level);
    if (item) return item;
  }
  throw new Error(`no ${level} evidence`);
}

function copyWith(file: string, edit: (value: Record<string, unknown>) => void): string {
  const copy = mkdtempSync(path.join(tmpdir(), 'vaporfit-probes-'));
  cpSync(dataDirectory, copy, { recursive: true });
  const target = path.join(copy, file);
  const value = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown>;
  edit(value);
  writeFileSync(target, JSON.stringify(value));
  return copy;
}

describe('probe folders named by data', () => {
  it('fails when a data file names a probe folder that does not exist', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      evidenceByLevel(value, 'tested').probe = 'repros/does-not-exist';
    });

    expect(() => {
      assertProbeFolders(copy, repoRoot);
    }).toThrow(/pinia\.json: missing probe folder repros\/does-not-exist/u);
  });

  it('fails when tested evidence names no probe', () => {
    const missing = copyWith('libraries/pinia.json', value => {
      evidenceByLevel(value, 'tested').probe = null;
    });
    const empty = copyWith('libraries/pinia.json', value => {
      evidenceByLevel(value, 'tested').probe = '';
    });

    expect(() => {
      assertProbeFolders(missing, repoRoot);
    }).toThrow(/pinia\.json: tested evidence names no probe/u);
    expect(() => {
      assertProbeFolders(empty, repoRoot);
    }).toThrow(/pinia\.json: tested evidence names no probe/u);
  });

  it('finds a folder for every probe path in the repository data', () => {
    expect(missingProbeFolders(dataDirectory, repoRoot)).toEqual([]);
  });
});
