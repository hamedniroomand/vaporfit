import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent, listComponents } from '#index.ts';
import manifest from '#pkg' with { type: 'json' };
import { newestDataDate, vuePin } from '#test/pins.ts';

const repoRoot = path.join(import.meta.dirname, '../..');
const objectRoot = path.join(repoRoot, 'repros/vue-object-directive');

function positionOf(source: string, needle: string): { line: number; column: number } {
  const offset = source.indexOf(needle);
  if (offset < 0) {
    throw new Error(`missing ${needle}`);
  }
  const line = source.slice(0, offset).split('\n').length;
  const column = offset - source.lastIndexOf('\n', offset - 1);
  return { line, column };
}

describe('analyze report', () => {
  it('returns schema 0 and blocks the local object directive', () => {
    const report = analyze(objectRoot);
    const source = readFileSync(path.join(objectRoot, 'src/VaporCase.vue'), 'utf8');
    const use = positionOf(source, 'v-mark');

    expect(report.schemaVersion).toBe(0);
    expect(report.tool).toEqual({ version: manifest.version, data: newestDataDate() });
    expect(report.project.root).toBe(path.resolve(objectRoot));
    expect(report.project.vue).toBe(vuePin(objectRoot));
    expect(report.project.compiler).toEqual({ source: 'project', version: vuePin(objectRoot) });
    expect(report.project.interopPlugin).toMatchObject({ state: 'installed', level: null });
    expect(report.project.coverage.withData).toEqual(expect.any(Array));
    expect(report.project.coverage.withoutData).toEqual(expect.any(Array));
    expect(report.summary.components).toBe(report.components.length);
    expect(
      report.summary.pure.ready + report.summary.pure.blocked + report.summary.pure.unknown,
    ).toBe(report.summary.components);
    expect(report.order).toEqual(expect.any(Array));
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);

    const component = getComponent(report, 'src/VaporCase.vue');
    expect(component?.file).toBe('src/VaporCase.vue');
    expect(component?.vapor).toBe(true);
    expect(component?.interop).toBe('blocked');
    expect(component?.findings).toContainEqual(
      expect.objectContaining({
        rule: 'vapor/object-directive',
        level: 'error',
        failure: 'silent',
        location: { file: 'src/VaporCase.vue', line: use.line, column: use.column },
      }),
    );
    expect(listComponents(report, { verdict: 'blocked' }).map(item => item.id)).toContain(
      'src/VaporCase.vue',
    );
    expect(report.groups.some(group => group.rule === 'vapor/object-directive')).toBe(true);
  });
});
