import { describe, expect, it } from 'vite-plus/test';

import {
  baseName,
  componentHash,
  componentsHash,
  countVerdicts,
  evidenceLinks,
  groupFindings,
  linkLabel,
  listComponents,
  parseRoute,
  percent,
  splitPath,
  type ViewComponent,
  type ViewFinding,
} from '../../ui/src/view.ts';

function finding(
  rule: string,
  level: string,
  line: number,
  extra: Partial<ViewFinding> = {},
): ViewFinding {
  return {
    failure: 'silent',
    level,
    location: { column: 1, file: 'src/A.vue', line },
    message: `${rule} message`,
    rule,
    ...extra,
  };
}

function component(
  file: string,
  interop: string,
  pure: string,
  findings: ViewFinding[] = [],
): ViewComponent {
  return { file, findings, id: file, interop, pure, vapor: false };
}

const components = [
  component('src/b/Ready.vue', 'ready', 'blocked', [finding('vapor/vdom-component', 'error', 1)]),
  component('src/a/Blocked.vue', 'blocked', 'blocked', [
    finding('reka-ui/as-child', 'error', 3),
    finding('vapor/vdom-component', 'error', 4),
  ]),
  component('src/Unknown.vue', 'unknown', 'ready'),
  component('src/c/Other.vue', 'blocked', 'blocked', [finding('reka-ui/as-child', 'error', 2)]),
];

const none = { query: '', rule: '', tier: 'interop', verdict: 'all' } as const;

describe('parseRoute', () => {
  it('reads each view and the filter of the component list', () => {
    expect(parseRoute('').view).toBe('summary');
    expect(parseRoute('#/').view).toBe('summary');
    expect(parseRoute('#/rankings').view).toBe('rankings');
    expect(parseRoute('#/libraries').view).toBe('libraries');
    expect(parseRoute('#/unknown-page').view).toBe('summary');
    expect(parseRoute('#/components?verdict=blocked&tier=pure&rule=vapor%2Fv-memo&q=Nav')).toEqual({
      id: '',
      query: 'Nav',
      rule: 'vapor/v-memo',
      tier: 'pure',
      verdict: 'blocked',
      view: 'components',
    });
  });

  it('uses the defaults for a filter value that is not known', () => {
    const route = parseRoute('#/components?verdict=fine&tier=other');
    expect(route.verdict).toBe('all');
    expect(route.tier).toBe('interop');
  });

  it('decodes the id of a component with a slash or a space', () => {
    const id = 'src/my pages/Home.vue';
    expect(parseRoute(componentHash(id))).toMatchObject({ id, view: 'detail' });
  });
});

describe('componentsHash', () => {
  it('writes only the values that are not the default', () => {
    expect(componentsHash({})).toBe('#/components');
    expect(componentsHash({ query: '', rule: '', tier: 'interop', verdict: 'all' })).toBe(
      '#/components',
    );
    expect(componentsHash({ tier: 'pure', verdict: 'ready' })).toBe(
      '#/components?verdict=ready&tier=pure',
    );
  });

  it('gives the same filter back after a parse', () => {
    const filter = {
      query: 'a&b=c',
      rule: 'reka-ui/as-child',
      tier: 'pure',
      verdict: 'unknown',
    } as const;
    expect(parseRoute(componentsHash(filter))).toMatchObject(filter);
  });
});

describe('listComponents', () => {
  it('puts blocked first, then unknown, then ready, then more findings first', () => {
    expect(listComponents(components, none).map(item => item.file)).toEqual([
      'src/a/Blocked.vue',
      'src/c/Other.vue',
      'src/Unknown.vue',
      'src/b/Ready.vue',
    ]);
  });

  it('filters by the verdict of the selected tier', () => {
    expect(
      listComponents(components, { ...none, verdict: 'ready' }).map(item => item.file),
    ).toEqual(['src/b/Ready.vue']);
    expect(
      listComponents(components, { ...none, tier: 'pure', verdict: 'ready' }).map(
        item => item.file,
      ),
    ).toEqual(['src/Unknown.vue']);
  });

  it('filters by rule and by a search text in any case', () => {
    expect(listComponents(components, { ...none, rule: 'reka-ui/as-child' })).toHaveLength(2);
    expect(
      listComponents(components, { ...none, query: '  BLOCKED ' }).map(item => item.file),
    ).toEqual(['src/a/Blocked.vue']);
  });

  it('counts each verdict, and reads a value that is not known as unknown', () => {
    expect(countVerdicts(components, 'interop')).toEqual({ blocked: 2, ready: 1, unknown: 1 });
    expect(countVerdicts([component('x.vue', 'other', 'ready')], 'interop').unknown).toBe(1);
  });
});

describe('small helpers', () => {
  it('gives a whole percent and 0 for an empty total', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });

  it('splits a path into the folder and the name', () => {
    expect(splitPath('src/pages/Home.vue')).toEqual({ folder: 'src/pages/', name: 'Home.vue' });
    expect(splitPath('App.vue')).toEqual({ folder: '', name: 'App.vue' });
  });

  it('gives the last part of a POSIX or a Windows root', () => {
    expect(baseName('/home/me/shop/')).toBe('shop');
    expect(baseName(String.raw`C:\work\shop`)).toBe('shop');
  });
});

describe('groupFindings', () => {
  it('makes one group for each rule and message, with errors first', () => {
    const groups = groupFindings([
      finding('reka-ui/as-child-other', 'unknown', 1),
      finding('vapor/vdom-component', 'error', 2, {
        chain: ['a', 'b'],
        package: { name: 'p', version: null },
      }),
      finding('vapor/vdom-component', 'error', 5),
    ]);
    expect(groups.map(group => [group.rule, group.places.length])).toEqual([
      ['vapor/vdom-component', 2],
      ['reka-ui/as-child-other', 1],
    ]);
    expect(groups[0]?.places[0]).toEqual({
      chain: ['a', 'b'],
      location: { column: 1, file: 'src/A.vue', line: 2 },
      package: 'p (not installed)',
    });
  });

  it('keeps two messages of one rule apart', () => {
    const groups = groupFindings([
      finding('vapor/x', 'error', 1, { message: 'one' }),
      finding('vapor/x', 'error', 2, { message: 'two' }),
    ]);
    expect(groups).toHaveLength(2);
  });
});

describe('evidence links', () => {
  it('gives a short label for each kind of GitHub link', () => {
    expect(linkLabel('https://github.com/nuxt/ui/issues/6395')).toBe('nuxt/ui #6395');
    expect(linkLabel('https://github.com/vuejs/core/pull/16219')).toBe('vuejs/core #16219');
    expect(
      linkLabel(
        'https://github.com/vuejs/core/blob/v3.6.0-rc.15/packages/runtime-vapor/src/component.ts#L908',
      ),
    ).toBe('vuejs/core packages/runtime-vapor/src/component.ts#L908');
    expect(linkLabel('https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1')).toBe(
      'vuejs/core v3.6.0-rc.1',
    );
    expect(linkLabel('https://github.com/vuejs/core/commit/051b5ad9dd18d42a31d2')).toBe(
      'vuejs/core 051b5ad',
    );
    expect(linkLabel('https://github.com/vuejs/core')).toBe('vuejs/core');
    expect(linkLabel('https://vuejs.org/guide/x')).toBe('vuejs.org/guide/x');
    expect(linkLabel('not a url')).toBe('not a url');
  });

  it('links a probe to its folder and skips a value that is not a web link', () => {
    const links = evidenceLinks([
      {
        depth: 'D1',
        environment: 'vite build, Chrome 156',
        level: 'tested',
        probe: 'repros/a',
        what: 'A trigger',
      },
      { depth: 'D1', environment: 'vite build', level: 'tested', probe: null },
      { level: 'issue', state: 'open', url: 'https://github.com/nuxt/ui/issues/6395' },
      { level: 'source', url: 'javascript:alert(1)' },
      'template',
    ]);
    expect(links).toEqual([
      {
        detail: 'A trigger · vite build, Chrome 156',
        kind: 'probe',
        label: 'repros/a',
        url: 'https://github.com/hamedniroomand/vaporfit/tree/main/repros/a',
      },
      {
        detail: 'open',
        kind: 'issue',
        label: 'nuxt/ui #6395',
        url: 'https://github.com/nuxt/ui/issues/6395',
      },
    ]);
    expect(evidenceLinks('template')).toEqual([]);
  });
});
