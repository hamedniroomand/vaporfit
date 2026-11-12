import { describe, expect, it } from 'vite-plus/test';

import type { Evidence, Failure, Library, Status } from '#data/types.ts';
import { toLibraryRow } from '#site/table.ts';

const REPO = 'https://github.com/hamedniroomand/vaporfit/blob/main/data/libraries';

function feature(
  id: string,
  status: Status,
  failure: Failure,
  evidence: Evidence[],
): Library['features'][number] {
  return {
    id,
    match: { kind: 'directive', name: 'x', export: null, from: 'pkg' },
    status,
    failure,
    message: 'message',
    evidence,
    fixedIn: null,
  };
}

function library(patch: Partial<Library> = {}): Library {
  return {
    schemaVersion: 0,
    package: 'pkg',
    repository: 'https://example.com/pkg',
    verified: { version: '1.2.3', vue: '3.6.0', date: '2026-11-10' },
    declared: null,
    interop: { status: 'unknown', evidence: [] },
    features: [],
    ...patch,
  };
}

describe('declaration cell', () => {
  it('uses No declaration when declared is null', () => {
    const row = toLibraryRow(library(), 'pkg.json', '2026-11-10');

    expect(row.declared).toEqual({ kind: 'none', text: 'No declaration' });
  });

  it('shows the scope, the link, and the first version from the file', () => {
    const row = toLibraryRow(
      library({
        declared: {
          scope: 'full',
          since: '11.2.0',
          url: 'https://example.com/statement',
          quote: 'a maintainer sentence that the table does not show',
        },
      }),
      'pkg.json',
      '2026-11-10',
    );

    expect(row.declared).toEqual({
      kind: 'statement',
      scope: 'full',
      url: 'https://example.com/statement',
      since: '11.2.0',
    });
    expect(JSON.stringify(row)).not.toContain('a maintainer sentence');
  });
});

describe('declaration scope', () => {
  it('keeps a null first version and does not add a scope', () => {
    const row = toLibraryRow(
      library({
        declared: {
          scope: 'partial',
          since: null,
          url: 'https://example.com/partial',
          quote: 'quote',
        },
      }),
      'pkg.json',
      '2026-11-10',
    );

    expect(row.declared).toEqual({
      kind: 'statement',
      scope: 'partial',
      url: 'https://example.com/partial',
      since: null,
    });
  });
});

describe('tested cell', () => {
  it('shows each tested evidence from interop and no other depth', () => {
    const row = toLibraryRow(
      library({
        interop: {
          status: 'partial',
          evidence: [
            { level: 'tested', depth: 'D1', environment: 'vite build, Chrome 156', probe: null },
            { level: 'issue', url: 'https://example.com/issue', state: 'open' },
            { level: 'tested', depth: 'D2', environment: 'second place', probe: 'repros/pkg' },
          ],
        },
        features: [
          feature('pkg/feature', 'broken', 'silent', [
            { level: 'tested', depth: 'D3', environment: 'feature only', probe: null },
          ]),
        ],
      }),
      'pkg.json',
      '2026-11-10',
    );

    expect(row.tested).toEqual([
      { depth: 'D1', environment: 'vite build, Chrome 156' },
      { depth: 'D2', environment: 'second place' },
    ]);
  });
});

describe('broken cell', () => {
  it('puts only broken features in the broken column', () => {
    const row = toLibraryRow(
      library({
        features: [
          feature('pkg/works', 'works', 'none', [
            { level: 'issue', url: 'https://example.com/works', state: 'open' },
          ]),
          feature('pkg/partial', 'partial', 'silent', []),
          feature('pkg/unknown', 'unknown', 'runtime-error', [
            { level: 'issue', url: 'https://example.com/unknown', state: 'open' },
          ]),
          feature('pkg/broken', 'broken', 'silent', [
            { level: 'source', url: 'https://example.com/source' },
            { level: 'issue', url: 'https://example.com/one', state: 'open' },
            { level: 'issue', url: 'https://example.com/two', state: 'open' },
          ]),
        ],
      }),
      'pkg.json',
      '2026-11-10',
    );

    expect(row.broken).toEqual([
      {
        id: 'pkg/broken',
        failure: 'silent',
        issues: ['https://example.com/one', 'https://example.com/two'],
        fixedInVue: null,
      },
    ]);
    expect(JSON.stringify(row.broken)).not.toContain('pkg/works');
    expect(JSON.stringify(row.broken)).not.toContain('pkg/partial');
    expect(JSON.stringify(row.broken)).not.toContain('pkg/unknown');
    expect(JSON.stringify(row)).not.toContain('"status"');
  });
});

describe('row age and edit link', () => {
  it('marks the row stale from the verified date and today', () => {
    const fresh = toLibraryRow(library(), 'pkg.json', '2026-11-10');
    const stale = toLibraryRow(library(), 'pkg.json', '2026-12-11');

    expect(fresh.stale).toBe(false);
    expect(fresh.mark).toBeNull();
    expect(stale.stale).toBe(true);
    expect(stale.mark).toBe('stale');
    expect(fresh.version).toBe('1.2.3');
    expect(fresh.date).toBe('2026-11-10');
    expect(fresh.editUrl).toBe(`${REPO}/pkg.json`);
  });
});

describe('broken cell fields', () => {
  it('shows a broken feature that has no issue link', () => {
    const row = toLibraryRow(
      library({
        features: [feature('pkg/broken', 'broken', 'runtime-error', [])],
      }),
      'pkg.json',
      '2026-11-10',
    );

    expect(row.broken).toEqual([
      { id: 'pkg/broken', failure: 'runtime-error', issues: [], fixedInVue: null },
    ]);
  });

  it('gives the Vue version that fixes a broken feature', () => {
    const fixed = { ...feature('pkg/broken', 'broken', 'silent', []), fixedInVue: '3.6.0-rc.15' };
    const row = toLibraryRow(library({ features: [fixed] }), 'pkg.json', '2026-11-10');

    expect(row.broken).toEqual([
      { id: 'pkg/broken', failure: 'silent', issues: [], fixedInVue: '3.6.0-rc.15' },
    ]);
  });
});
