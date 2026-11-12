import { describe, expect, it } from 'vite-plus/test';

import { unifiedDiff } from '#fix/diff.ts';
import { formatText } from '#format/text.ts';
import type { ComponentReport, Finding, Report } from '#report/types.ts';
import { RULE } from '#rules/messages.ts';

function finding(patch: Partial<Finding>): Finding {
  return {
    evidence: ['template'],
    failure: 'silent',
    level: 'error',
    location: { column: 1, file: 'src/A.vue', line: 1 },
    message: 'message',
    rule: RULE.vdom,
    ...patch,
  };
}

function component(
  id: string,
  pure: ComponentReport['pure'],
  findings: Finding[],
): ComponentReport {
  return { file: id, findings, id, interop: 'blocked', pure, unresolved: [], vapor: false };
}

function report(components: ComponentReport[]): Report {
  return {
    components,
    groups: [],
    order: [],
    project: {
      compiler: { source: 'project', version: '3.6.0' },
      coverage: { stale: [], withData: [], withoutData: [] },
      interopPlugin: { level: null, location: null, state: 'installed' },
      root: '/project',
      vue: '3.6.0',
    },
    schemaVersion: 0,
    summary: {
      components: components.length,
      interop: { blocked: 0, ready: 0, unknown: 0 },
      pure: { blocked: 0, ready: 0, unknown: 0 },
    },
    tool: { data: '2026-11-10', version: '0.0.0' },
  };
}

describe('text report edges', () => {
  it('prints a declaration and sorts equal cause counts by name', () => {
    const text = formatText(
      report([
        component('src/A.vue', 'blocked', [
          finding({
            declared: '1.0.0',
            package: { name: 'right-lib', verified: '1.0.0', version: '1.0.0' },
          }),
        ]),
        component('src/B.vue', 'blocked', [
          finding({
            declared: '2.0.0',
            location: { column: 1, file: 'src/B.vue', line: 1 },
            package: { name: 'left-lib', verified: '2.0.0', version: '2.0.0' },
          }),
        ]),
      ]),
    );
    const keeps = text.slice(text.indexOf('Keeps the VDOM runtime'));

    expect(keeps.indexOf('left-lib 1 2.0.0')).toBeGreaterThanOrEqual(0);
    expect(keeps.indexOf('left-lib 1 2.0.0')).toBeLessThan(keeps.indexOf('right-lib 1 1.0.0'));
  });

  it('sorts a compile finding before a finding with no failure', () => {
    const text = formatText(
      report([
        component('src/A.vue', 'ready', [
          finding({ failure: 'none', level: 'unknown', message: 'none case', rule: RULE.memo }),
          finding({
            failure: 'compile',
            location: { column: 2, file: 'src/A.vue', line: 2 },
            message: 'compile case',
            rule: RULE.memo,
          }),
        ]),
      ]),
    );

    expect(text.indexOf('compile case')).toBeLessThan(text.indexOf('none case'));
  });
});

describe('unified diff', () => {
  it('prints a removed line that stays after the common lines', () => {
    expect(unifiedDiff('a.txt', 'a\nb\nc\n', 'a\nb\n')).toContain('\n-c\n');
  });

  it('prints an added line that stays after the common lines', () => {
    expect(unifiedDiff('a.txt', 'a\n', 'a\nb\n')).toContain('\n+b\n');
  });
});
