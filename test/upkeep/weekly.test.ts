import { describe, expect, it } from 'vite-plus/test';

import type { Library } from '#data/types.ts';
import type { WeeklyPlan } from '#upkeep/weekly-plan.ts';
import { planWeeklyUpdate } from '#upkeep/weekly-plan.ts';

const date = '2026-11-10';
const vueTags = { latest: '3.5.25', rc: '3.6.0-rc.15' };

function tested(probe: string | null): Library['interop']['evidence'] {
  return [{ level: 'tested', depth: 'D1', environment: 'vite build, Chrome', probe }];
}

function library(options: {
  name?: string;
  version?: string;
  interopStatus?: Library['interop']['status'];
  probe?: string | null;
  featureStatus?: Library['features'][number]['status'];
  issueUrl?: string;
}): Library {
  const name = options.name ?? 'example-lib';
  const testedEvidence = options.probe === undefined ? [] : tested(options.probe);
  const issues =
    options.issueUrl === undefined
      ? []
      : [{ level: 'issue' as const, url: options.issueUrl, state: 'open' }];
  return {
    schemaVersion: 0,
    package: name,
    repository: `https://github.com/example/${name}`,
    verified: {
      version: options.version ?? '1.0.0',
      vue: '3.6.0-rc.14',
      date: '2026-11-01',
    },
    declared: null,
    interop: {
      status: options.interopStatus ?? 'unknown',
      evidence: options.featureStatus === undefined ? [...testedEvidence, ...issues] : issues,
    },
    features:
      options.featureStatus === undefined
        ? []
        : [
            {
              id: `${name}/case`,
              match: { kind: 'directive', name: 'x', export: null, from: name },
              status: options.featureStatus,
              failure: 'silent',
              message: 'case',
              evidence: testedEvidence,
              fixedIn: null,
            },
          ],
  };
}

function copy(data: Library): Library {
  return JSON.parse(JSON.stringify(data)) as Library;
}

function update(
  data: Library,
  extra: Partial<Parameters<typeof planWeeklyUpdate>[0]> = {},
): WeeklyPlan {
  return planWeeklyUpdate({
    libraries: [{ file: `libraries/${data.package}.json`, data }],
    npmLatest: { [data.package]: '2.0.0' },
    vueTags,
    probes: {},
    issueStates: {},
    date,
    ...extra,
  });
}

describe('a row with no probe', () => {
  it('leaves a row with no probe unchanged', () => {
    const data = library({});
    const before = copy(data);

    const plan = update(data);

    expect(data).toEqual(before);
    expect(plan.changedFiles).toEqual([]);
    expect(plan.libraries[0]?.data).toEqual(before);
    expect(plan.personItems.join('\n')).toContain('example-lib');
    expect(plan.personItems.join('\n')).toContain('2.0.0');
    expect(plan.closeIssue).toBe(false);
  });
});

describe('a newer installed version', () => {
  it('does not set status to works when a newer version is installed', () => {
    const data = library({
      interopStatus: 'unknown',
      featureStatus: 'broken',
      probe: 'repros/example-lib',
    });

    const plan = update(data, {
      probes: {
        'repros/example-lib': { expected: 'works', observed: 'works' },
      },
    });
    const next = plan.libraries[0]?.data;

    expect(next?.interop.status).toBe('unknown');
    expect(next?.features[0]?.status).toBe('broken');
    expect(next?.verified.version).toBe('2.0.0');
    expect(next?.verified.date).toBe(date);
    expect(plan.changedFiles).toEqual(['libraries/example-lib.json']);
  });
});

describe('a probe result that differs from expected', () => {
  it('lists a probe result that differs from expected and keeps the row', () => {
    const data = library({
      interopStatus: 'broken',
      probe: 'repros/example-lib',
    });

    const plan = update(data, {
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'works' },
      },
    });
    const next = plan.libraries[0]?.data;

    expect(plan.description.startsWith('Probe results that differ from expected')).toBe(true);
    expect(plan.description).toContain('repros/example-lib: expected breaks, observed works');
    expect(plan.personItems.join('\n')).toContain(
      'repros/example-lib: expected breaks, observed works',
    );
    expect(next?.interop.status).toBe('broken');
    expect(next?.verified.version).toBe('1.0.0');
    expect(plan.changedFiles).toEqual([]);
    expect(plan.description.indexOf('Probe results that differ from expected')).toBeLessThan(
      plan.description.indexOf('Vue tags'),
    );
  });
});

describe('Vue 3.5 tags', () => {
  it('does not write a 3.5 Vue version into verified.vue', () => {
    const data = library({ probe: 'repros/example-lib' });

    const plan = update(data, {
      vueTags: { latest: '3.5.25', rc: '3.5.26-rc.1' },
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'breaks' },
      },
    });

    expect(plan.vueInstalled).toBeNull();
    expect(plan.libraries[0]?.data.verified.vue).toBe('3.6.0-rc.14');
    expect(plan.libraries[0]?.data.verified.version).toBe('2.0.0');
    expect(plan.description).toContain('latest: 3.5.25');
    expect(plan.description).toContain('rc: 3.5.26-rc.1');
  });
});

describe('a 3.6 Vue pre-release', () => {
  it('rejects a pre-release older than 3.6.0-rc.14 and installs 3.6.1', () => {
    const probes = {
      'repros/example-lib': { expected: 'breaks' as const, observed: 'breaks' as const },
    };
    const rejected = update(library({ probe: 'repros/example-lib' }), {
      vueTags: { latest: '3.5.25', rc: '3.6.0-rc.1' },
      probes,
    });
    const accepted = update(library({ probe: 'repros/example-lib' }), {
      vueTags: { latest: '3.6.1', rc: '3.6.0-rc.1' },
      probes,
    });
    expect(rejected.vueInstalled).toBeNull();
    expect(rejected.libraries[0]?.data.verified.vue).toBe('3.6.0-rc.14');
    expect(accepted.vueInstalled).toBe('3.6.1');
    expect(accepted.libraries[0]?.data.verified.vue).toBe('3.6.1');
  });

  it('records both Vue tags and installs a 3.6 pre-release at the floor', () => {
    const data = library({ probe: 'repros/example-lib' });

    const plan = update(data, {
      vueTags: { latest: '3.5.25', rc: '3.6.0-rc.14' },
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'breaks' },
      },
    });

    expect(plan.vueInstalled).toBe('3.6.0-rc.14');
    expect(plan.libraries[0]?.data.verified.vue).toBe('3.6.0-rc.14');
    expect(plan.description).toContain('latest: 3.5.25');
    expect(plan.description).toContain('rc: 3.6.0-rc.14');
    expect(plan.description).toContain('installed: 3.6.0-rc.14');
  });
});

describe('which Vue tag is installed', () => {
  it('does not install Vue 3.7 when a 3.6 pre-release is available', () => {
    const data = library({ probe: 'repros/example-lib' });

    const plan = update(data, {
      vueTags: { latest: '3.7.0', rc: '3.6.0-rc.15' },
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'breaks' },
      },
    });

    expect(plan.vueInstalled).toBe('3.6.0-rc.15');
    expect(plan.libraries[0]?.data.verified.vue).toBe('3.6.0-rc.15');
  });

  it('installs Vue 3.6.0 when that tag is newer than the pre-release', () => {
    const data = library({ probe: 'repros/example-lib' });

    const plan = update(data, {
      vueTags: { latest: '3.6.0', rc: '3.6.0-rc.16' },
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'breaks' },
      },
    });

    expect(plan.vueInstalled).toBe('3.6.0');
  });
});

describe('a closed issue', () => {
  it('lists a closed issue before the Vue tags and keeps the data state', () => {
    const url = 'https://github.com/example/repo/issues/7';
    const data = library({ issueUrl: url });

    const plan = update(data, {
      npmLatest: { 'example-lib': '1.0.0' },
      issueStates: { [url]: 'closed' },
    });
    const issue = plan.libraries[0]?.data.interop.evidence.find(item => item.level === 'issue');

    expect(plan.description.startsWith('Closed issues')).toBe(true);
    expect(plan.description.indexOf('Closed issues')).toBeLessThan(
      plan.description.indexOf('Vue tags'),
    );
    expect(plan.description).toContain(url);
    expect(plan.personItems.join('\n')).toContain(url);
    expect(issue).toMatchObject({ level: 'issue', state: 'open', url });
    expect(plan.changedFiles).toEqual([]);
  });
});

describe('a probe the job did not finish', () => {
  it('does not change a row whose probe the job did not run', () => {
    const data = library({ probe: 'repros/example-lib', interopStatus: 'broken' });
    const before = copy(data);

    const plan = update(data, { probes: {} });

    expect(plan.libraries[0]?.data).toEqual(before);
    expect(plan.changedFiles).toEqual([]);
    expect(plan.libraries[0]?.data.interop.status).toBe('broken');
  });
});

describe('a probe that does not finish', () => {
  it('does not record a newer version when the probe does not finish', () => {
    const data = library({ probe: 'repros/example-lib', interopStatus: 'broken' });

    const plan = update(data, {
      probes: {
        'repros/example-lib': { expected: 'breaks', observed: 'error' },
      },
    });

    expect(plan.libraries[0]?.data.verified.version).toBe('1.0.0');
    expect(plan.libraries[0]?.data.interop.status).toBe('broken');
    expect(plan.changedFiles).toEqual([]);
    expect(plan.description).toContain('repros/example-lib: the probe did not finish');
    expect(plan.personItems.join('\n')).toContain('repros/example-lib: the probe did not finish');
  });
});

describe('a works status', () => {
  it('does not let a works status move onto the new version without a person', () => {
    const data = library({ interopStatus: 'works', probe: 'repros/example-lib' });

    const plan = update(data, {
      probes: {
        'repros/example-lib': { expected: 'works', observed: 'works' },
      },
    });

    expect(plan.libraries[0]?.data.interop.status).toBe('works');
    expect(plan.libraries[0]?.data.verified.version).toBe('1.0.0');
    expect(plan.changedFiles).toEqual([]);
    expect(plan.personItems.join('\n')).toContain('example-lib');
    expect(plan.personItems.join('\n')).toContain('does not inherit works');
    expect(plan.closeIssue).toBe(false);
  });
});
