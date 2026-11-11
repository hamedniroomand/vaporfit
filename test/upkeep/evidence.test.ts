import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { assertWorksHasEvidence } from '#upkeep/evidence.ts';

const dataDirectory = path.join(import.meta.dirname, '../../data');

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
  const copy = mkdtempSync(path.join(tmpdir(), 'vaporfit-evidence-'));
  cpSync(dataDirectory, copy, { recursive: true });
  const target = path.join(copy, file);
  const value = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown>;
  edit(value);
  writeFileSync(target, JSON.stringify(value));
  return copy;
}

describe('works status evidence', () => {
  it('fails when a status is works and the evidence is empty', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      const interop = value.interop as { status: string; evidence: unknown[] };
      interop.status = 'works';
      interop.evidence = [];
    });

    expect(() => {
      assertWorksHasEvidence(copy);
    }).toThrow(/pinia\.json: interop\.status is works and evidence is empty/u);
  });

  it('fails when a feature status is works and the evidence is empty', () => {
    const copy = copyWith('libraries/element-plus.json', value => {
      const features = value.features as { id: string; status: string; evidence: unknown[] }[];
      const feature = features[0];
      if (!feature) throw new Error('missing feature');
      feature.status = 'works';
      feature.evidence = [];
    });

    expect(() => {
      assertWorksHasEvidence(copy);
    }).toThrow(
      /element-plus\.json: element-plus\/v-loading status is works and evidence is empty/u,
    );
  });

  it('accepts works when the same file has evidence', () => {
    const copy = copyWith('libraries/pinia.json', value => {
      const interop = value.interop as { status: string };
      interop.status = 'works';
      evidenceByLevel(value, 'tested').depth = 'D1';
    });

    expect(() => {
      assertWorksHasEvidence(copy);
    }).not.toThrow();
  });
});
