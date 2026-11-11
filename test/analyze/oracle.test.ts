import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';
import type { Finding } from '#index.ts';

const repoRoot = path.join(import.meta.dirname, '../..');

const blocked: { project: string; rule: string; token: string }[] = [
  { project: 'repros/reka-ui-as-child', rule: 'reka-ui/as-child', token: 'as-child' },
  { project: 'repros/vue-object-directive', rule: 'vapor/object-directive', token: 'v-mark' },
  { project: 'repros/element-plus-v-loading', rule: 'element-plus/v-loading', token: 'v-loading' },
  {
    project: 'repros/vueuse-on-click-outside',
    rule: 'vueuse/v-on-click-outside',
    token: 'v-on-click-outside',
  },
  { project: 'repros/floating-vue-v-tooltip', rule: 'floating-vue/v-tooltip', token: 'v-tooltip' },
  { project: 'repros/primevue-v-tooltip', rule: 'primevue/v-tooltip', token: 'v-tooltip' },
  { project: 'repros/vue-i18n-v-t', rule: 'vue-i18n/v-t', token: 'v-t' },
  { project: 'repros/reka-ui-dropdown-menu-trigger', rule: 'reka-ui/as-child', token: 'as-child' },
  { project: 'repros/vue-i18n-global-t', rule: 'vue-i18n/global-properties', token: '$t' },
  {
    project: 'repros/vue-router-global-route',
    rule: 'vue-router/global-properties',
    token: '$route',
  },
];

const ready = ['repros/reka-ui-dialog', 'repros/primevue-button', 'repros/element-plus-components'];

for (const item of blocked) {
  it(`${item.project} is blocked`, () => {
    const report = analyze(path.join(repoRoot, item.project));
    const component = report.components.find(entry => entry.id === 'src/VaporCase.vue');
    const finding = component?.findings.find(entry => entry.rule === item.rule);
    expect(component?.interop).toBe('blocked');
    expect(finding?.level).toBe('error');
    expect(tokenAt(item.project, finding, item.token.length)).toBe(item.token);
    expect(report.project.compiler).toEqual({ source: 'project', version: '3.6.0-rc.14' });
  });
}

for (const project of ready) {
  it(`${project} is ready`, () => {
    const report = analyze(path.join(repoRoot, project));
    const component = getComponent(report, 'src/VaporCase.vue');
    expect(component?.interop).toBe('ready');
    expect(component?.pure).toBe('blocked');
    expect(
      component?.findings.filter(
        finding => finding.level === 'error' && finding.rule !== 'vapor/vdom-component',
      ),
    ).toEqual([]);
    expect(report.project.vue).toBe('3.6.0-rc.14');
  });
}

function tokenAt(project: string, finding: Finding | undefined, length: number): string {
  if (finding === undefined) return '';
  const source = readFileSync(path.join(repoRoot, project, 'src/VaporCase.vue'), 'utf8');
  const line = source.split('\n')[finding.location.line - 1] ?? '';
  return line.slice(finding.location.column - 1, finding.location.column - 1 + length);
}
