import { describe, expect, it } from 'vite-plus/test';

import { fillBlock, libraryMarkdown, ruleMarkdown } from '#site/markdown.ts';
import type { LibraryRow } from '#site/table.ts';

function row(patch: Partial<LibraryRow> = {}): LibraryRow {
  return {
    package: 'pkg',
    file: 'pkg.json',
    version: '1.2.3',
    date: '2026-11-10',
    stale: false,
    mark: null,
    declared: { kind: 'none', text: 'No declaration' },
    tested: [],
    broken: [],
    editUrl: 'https://example.com/pkg.json',
    ...patch,
  };
}

describe('libraryMarkdown', () => {
  it('writes the build date and one line for a library with no data', () => {
    const lines = libraryMarkdown({ rows: [row()], builtOn: '2026-11-11' }).split('\n');

    expect(lines[0]).toBe('The build date is 2026-11-11.');
    expect(lines.at(-1)).toBe(
      '| **pkg**<br>[edit this row](https://example.com/pkg.json) | 1.2.3 | No declaration |  |  | 2026-11-10 |',
    );
  });

  it('writes the statement, the tests, the broken features and the stale mark', () => {
    const line = libraryMarkdown({
      rows: [
        row({
          mark: 'stale',
          declared: {
            kind: 'statement',
            scope: 'partial',
            url: 'https://github.com/owner/repo/releases/tag/v2.0.0',
            since: '2.0.0',
          },
          tested: [{ depth: 'D1', environment: 'vite build, Chrome 156' }],
          broken: [
            {
              id: 'pkg/v-x',
              failure: 'silent',
              issues: ['https://github.com/owner/repo/issues/12'],
              fixedInVue: null,
            },
            { id: 'pkg/as-child', failure: 'silent', issues: [], fixedInVue: '3.6.0-rc.15' },
          ],
        }),
      ],
      builtOn: '2026-12-31',
    })
      .split('\n')
      .at(-1);

    expect(line).toContain(
      '| Scope: partial<br>[owner/repo v2.0.0](https://github.com/owner/repo/releases/tag/v2.0.0)<br>First version: 2.0.0 |',
    );
    expect(line).toContain('| D1, vite build, Chrome 156 |');
    expect(line).toContain(
      '| `pkg/v-x`<br>Failure: silent<br>[owner/repo 12](https://github.com/owner/repo/issues/12)<br><br>`pkg/as-child`<br>Failure: silent<br>Fixed in Vue 3.6.0-rc.15 |',
    );
    expect(line).toContain('| 2026-11-10 stale |');
  });
});

describe('libraryMarkdown statement', () => {
  it('omits the first version when the statement has none', () => {
    const line = libraryMarkdown({
      builtOn: '2026-11-11',
      rows: [
        row({
          declared: {
            kind: 'statement',
            scope: 'full',
            since: null,
            url: 'https://example.com/note',
          },
        }),
      ],
    })
      .split('\n')
      .at(-1);

    expect(line).toContain('Scope: full<br>[example.com/note](https://example.com/note)');
    expect(line).not.toContain('First version');
  });
});

describe('ruleMarkdown', () => {
  it('escapes the characters that end a cell or start an HTML tag', () => {
    const line = ruleMarkdown([
      {
        id: 'vapor/x',
        title: 'A <script> with a | character',
        failure: 'compile',
        tiers: ['interop', 'pure'],
        sources: ['https://nuxt.com/blog/v4-6'],
      },
    ])
      .split('\n')
      .at(-1);

    expect(line).toBe(
      '| `vapor/x` | A \\<script\\> with a \\| character | compile | interop, pure | [nuxt.com/blog/v4-6](https://nuxt.com/blog/v4-6) |',
    );
  });
});

describe('fillBlock', () => {
  const page = 'Intro\n\n<!-- prettier-ignore-start -->\nold\n<!-- prettier-ignore-end -->\n';

  it('replaces the content between the markers and keeps the other text', () => {
    const filled = fillBlock(page, 'new');

    expect(filled).toBe(
      'Intro\n\n<!-- prettier-ignore-start -->\n\nnew\n\n<!-- prettier-ignore-end -->\n',
    );
    expect(fillBlock(filled, 'new')).toBe(filled);
  });

  it('throws when the page has no markers', () => {
    expect(() => fillBlock('Intro\n', 'new')).toThrow('The page has no block for the table');
  });
});
