import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import type { Feature, Library } from '#data/types.ts';
import type { Project } from '#project/project.ts';
import { openProject } from '#project/project.ts';
import { propHits } from '#rules/features.ts';
import { hitFindings } from '#rules/findings.ts';

const location = { column: 1, file: 'src/App.vue', line: 1 };

function library(fixedInVue: string | undefined): Library {
  const feature: Feature = {
    evidence: [],
    failure: 'silent',
    fixedIn: null,
    id: 'pkg/as-child',
    match: { from: 'pkg', kind: 'prop', name: 'as-child' },
    message: 'as-child does not pass attributes',
    status: 'broken',
  };
  if (fixedInVue !== undefined) feature.fixedInVue = fixedInVue;
  return {
    declared: null,
    features: [feature],
    interop: { evidence: [], status: 'unknown' },
    package: 'pkg',
    repository: 'https://example.com/pkg',
    schemaVersion: 0,
    verified: { date: '2026-11-12', version: '1.0.0', vue: '3.6.0-rc.15' },
  };
}

/** A project folder with an installed `vue` package of one version, or with no `vue` package. */
function project(vue: string | null, fixedInVue: string | undefined, pkg = '1.0.0'): Project {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-vue-fix-'));
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: { pkg: '1.0.0' }, name: 'app', private: true }),
  );
  for (const [name, version] of [
    ['pkg', pkg],
    ['vue', vue],
  ] as const) {
    if (version === null) continue;
    mkdirSync(path.join(root, 'node_modules', name), { recursive: true });
    writeFileSync(
      path.join(root, 'node_modules', name, 'package.json'),
      JSON.stringify({ name, version }),
    );
  }
  return openProject(root, { libraries: [library(fixedInVue)], rules: [] });
}

function messages(vue: string | null, fixedInVue?: string, pkg?: string): string[] {
  const opened = project(vue, fixedInVue, pkg);
  const hits = propHits(opened, { component: 'DialogTrigger', prop: 'as-child', source: 'pkg' });
  return hitFindings(opened, hits, location).map(finding => finding.message);
}

const fixed = 'as-child does not pass attributes. Vue 3.6.0-rc.15 fixes this.';

describe('fixedInVue', () => {
  it('gives no finding when the Vue of the project has the fix', () => {
    expect(messages('3.6.0-rc.15', '3.6.0-rc.15')).toEqual([]);
    expect(messages('3.6.0-rc.16', '3.6.0-rc.15')).toEqual([]);
    expect(messages('3.6.0', '3.6.0-rc.15')).toEqual([]);
    expect(messages('3.7.0-alpha.1', '3.6.0-rc.15')).toEqual([]);
  });

  it('keeps the finding and names the fix when the Vue of the project is older', () => {
    expect(messages('3.6.0-rc.14', '3.6.0-rc.15')).toEqual([fixed]);
    expect(messages('3.6.0-rc.9', '3.6.0-rc.15')).toEqual([fixed]);
    expect(messages('3.6.0-beta.17', '3.6.0-rc.15')).toEqual([fixed]);
    expect(messages('3.5.45', '3.6.0-rc.15')).toEqual([fixed]);
  });

  it('keeps the finding when the tool cannot read the Vue version', () => {
    expect(messages(null, '3.6.0-rc.15')).toEqual([fixed]);
    expect(messages('not-a-version', '3.6.0-rc.15')).toEqual([fixed]);
  });

  it('puts a period before each note', () => {
    expect(messages('3.6.0-rc.14', undefined, '2.0.0')).toEqual([
      'as-child does not pass attributes. The data was verified for version 1.0.0. The project has version 2.0.0.',
    ]);
    expect(messages('3.6.0-rc.14', '3.6.0-rc.15', '2.0.0')).toEqual([
      `${fixed} The data was verified for version 1.0.0. The project has version 2.0.0.`,
    ]);
  });

  it('does not change a feature without fixedInVue', () => {
    expect(messages('3.6.0-rc.15')).toEqual(['as-child does not pass attributes']);
  });
});
