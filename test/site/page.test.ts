import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { buildDate } from '#data/freshness.ts';
import { loadData } from '#data/load.ts';
import { libraryPage, libraryRows, ruleRows } from '#site/table.ts';

const dataDirectory = path.join(import.meta.dirname, '../../data');
const STATUSES = ['works', 'partial', 'broken', 'unknown'];
const REPO = 'https://github.com/hamedniroomand/vaporfit/blob/main/data/libraries';

describe('library count', () => {
  it('loads the 25 libraries and does not add a status', () => {
    const rows = libraryRows(dataDirectory, '2026-11-10');
    const { libraries } = loadData(dataDirectory);

    expect(rows.map(row => row.package)).toHaveLength(25);
    expect(new Set(rows.map(row => row.package)).size).toBe(25);

    for (const item of libraries) {
      expect(STATUSES).toContain(item.interop.status);
      for (const entry of item.features) expect(STATUSES).toContain(entry.status);
    }

    for (const row of rows) {
      const item = libraries.find(library => library.package === row.package);
      const file = JSON.parse(
        readFileSync(path.join(dataDirectory, 'libraries', row.file), 'utf8'),
      ) as { package: string };

      expect(item).toBeDefined();
      expect(file.package).toBe(row.package);
      expect(row.version).toBe(item?.verified.version);
      expect(row.date).toBe(item?.verified.date);
      expect(row.editUrl).toBe(`${REPO}/${row.file}`);
      expect(row.stale).toBe(false);
      expect(row.mark).toBeNull();
      expect(row.broken.map(entry => entry.id)).toEqual(
        item?.features.filter(entry => entry.status === 'broken').map(entry => entry.id),
      );
      expect(row.tested).toEqual(
        item?.interop.evidence.flatMap(entry =>
          entry.level === 'tested' ? [{ depth: entry.depth, environment: entry.environment }] : [],
        ),
      );
      expect(JSON.stringify(row)).not.toContain('"status"');
    }
  });
});

describe('library statements', () => {
  it('shows No declaration for vue-router and the statement fields for vue-i18n', () => {
    const rows = libraryRows(dataDirectory, '2026-11-10');
    const router = rows.find(row => row.package === 'vue-router');
    const i18n = rows.find(row => row.package === 'vue-i18n');
    const unhead = rows.find(row => row.package === '@unhead/vue');

    expect(router?.declared).toEqual({ kind: 'none', text: 'No declaration' });
    expect(router?.file).toBe('vue-router.json');
    expect(router?.version).toBe('5.4.0');
    expect(router?.broken).toEqual([
      { id: 'vue-router/global-properties', failure: 'runtime-error', issues: [] },
    ]);
    expect(i18n?.declared).toEqual({
      kind: 'statement',
      scope: 'full',
      url: 'https://github.com/intlify/vue-i18n/releases/tag/v11.2.0',
      since: '11.2.0',
    });
    expect(unhead?.declared).toEqual({
      kind: 'statement',
      scope: 'partial',
      url: 'https://github.com/unjs/unhead/blob/main/docs/0.vue/head/guides/1.core-concepts/6.vapor.md',
      since: null,
    });
  });
});

describe('known broken column', () => {
  it('does not put an unknown feature in the broken column', () => {
    const rows = libraryRows(dataDirectory, '2026-11-10');
    const reka = rows.find(row => row.package === 'reka-ui');
    const floating = rows.find(row => row.package === 'floating-vue');

    expect(reka?.broken.map(entry => entry.id)).toEqual(['reka-ui/as-child']);
    expect(reka?.broken[0]?.issues).toEqual([
      'https://github.com/unovue/shadcn-vue/issues/2006',
      'https://github.com/nuxt/ui/issues/6395',
    ]);
    expect(reka?.tested).toEqual([{ depth: 'D1', environment: 'vite build, Chrome 156' }]);
    expect(floating?.tested).toEqual([]);
    expect(floating?.broken).toEqual([
      { id: 'floating-vue/v-tooltip', failure: 'silent', issues: [] },
    ]);
  });
});

describe('current rows', () => {
  it('marks every current row stale only when today is more than 30 days later', () => {
    const fresh = libraryRows(dataDirectory, '2026-11-10');
    const stale = libraryRows(dataDirectory, '2026-12-11');

    expect(fresh.every(row => row.mark === null)).toBe(true);
    expect(stale.every(row => row.mark === 'stale')).toBe(true);
  });

  it('passes the real build date when the caller omits today', () => {
    const page = libraryPage(dataDirectory);

    expect(page.builtOn).toBe(buildDate());
    expect(page.rows).toHaveLength(25);
    expect(page.rows.every(row => row.date === '2026-11-10')).toBe(true);
  });
});

describe('ruleRows', () => {
  it('loads every rule file', () => {
    const rows = ruleRows(dataDirectory);
    const { rules } = loadData(dataDirectory);

    expect(rows).toHaveLength(12);
    expect(rows.map(row => row.id)).toEqual(rules.map(rule => rule.id));
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual([
      'failure',
      'id',
      'sources',
      'tiers',
      'title',
    ]);

    for (const row of rows) {
      const rule = rules.find(item => item.id === row.id);
      expect(row.title).toBe(rule?.title);
      expect(row.failure).toBe(rule?.failure);
      expect(row.tiers).toEqual(rule?.tiers);
      expect(row.sources).toEqual(rule?.sources);
    }
  });
});
