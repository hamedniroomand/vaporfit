import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import type { Library } from '#data/types.ts';
import { openProject } from '#project/project.ts';
import { propHits } from '#rules/features.ts';

function library(): Library {
  return {
    declared: null,
    features: [
      {
        evidence: [],
        failure: 'silent',
        fixedIn: null,
        id: 'pkg/as-child',
        match: { components: ['Button'], from: 'pkg', kind: 'prop', name: 'asChild' },
        message: 'as-child',
        status: 'broken',
      },
      {
        evidence: [],
        failure: 'silent',
        fixedIn: null,
        id: 'pkg/other',
        match: { from: 'other-pkg', kind: 'prop', name: 'other' },
        message: 'other',
        status: 'broken',
      },
    ],
    interop: { evidence: [], status: 'unknown' },
    package: 'pkg',
    repository: 'https://example.com/pkg',
    schemaVersion: 0,
    verified: { date: '2026-11-01', version: '1.0.0', vue: '3.6.0' },
  };
}

describe('prop hits', () => {
  it('keeps a prop of the package and drops a prop from another package', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-props-'));
    writeFileSync(
      path.join(root, 'package.json'),
      '{ "name": "vaporfit-props", "private": true }\n',
    );
    const project = openProject(root, { libraries: [library()], rules: [] });

    expect(
      propHits(project, { component: 'Button', prop: 'as-child', source: 'pkg/extra' }).map(
        item => item.feature.id,
      ),
    ).toEqual(['pkg/as-child']);
    expect(propHits(project, { component: 'Button', prop: 'other', source: 'pkg' })).toEqual([]);
  });
});
