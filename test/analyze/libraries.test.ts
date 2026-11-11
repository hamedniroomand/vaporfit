import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import type { CompatData, Feature, Library, Status } from '#data/types.ts';
import { analyze, getComponent } from '#index.ts';

import { described, must } from './assert.ts';

const fixtures = path.join(import.meta.dirname, '../fixtures');

function demoData(status: Status, label: Status | null): CompatData {
  const features: Feature[] = [
    {
      evidence: [{ level: 'declared' }],
      failure: 'silent',
      fixedIn: null,
      id: 'demo-ui/widget',
      match: { from: 'demo-ui', kind: 'prop', name: 'widget' },
      message: 'Widget message.',
      status,
    },
  ];
  if (label !== null) {
    features.push({
      evidence: [],
      failure: 'runtime-error',
      fixedIn: null,
      id: 'demo-ui/label',
      match: { kind: 'globalProperty', names: ['$label'] },
      message: 'Label message.',
      status: label,
    });
  }
  const library: Library = {
    declared: null,
    features,
    interop: { evidence: [], status: 'partial' },
    package: 'demo-ui',
    repository: 'https://example.com/demo-ui',
    schemaVersion: 0,
    verified: { date: '2026-11-10', version: '1.0.0', vue: '3.6.0-rc.14' },
  };
  return { libraries: [library], rules: [] };
}

function installPackage(root: string, name: string, body: Record<string, unknown>): void {
  const directory = path.join(root, 'node_modules', ...name.split('/'));
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, ...body }));
}

describe('library features', () => {
  const rules = analyze(path.join(fixtures, 'rules'));

  it('blocks a broken directive and follows aliases', () => {
    const loading = must(
      getComponent(rules, 'src/Loading.vue')?.findings.find(
        item => item.rule === 'element-plus/v-loading',
      ),
      described(rules, 'src/Loading.vue'),
    );
    expect(loading.message).toBe('v-loading is an object directive. Vapor skips it');
    expect(loading.chain).toEqual(['src/Loading.vue', 'element-plus']);
    expect(loading.package).toEqual({ name: 'element-plus', verified: '2.14.8', version: null });
    expect(
      getComponent(rules, 'src/Alias.vue')?.findings.some(
        item => item.rule === 'primevue/v-tooltip',
      ),
    ).toBe(true);
    expect(
      getComponent(rules, 'src/Namespace.vue')?.findings.some(
        item => item.rule === 'floating-vue/v-tooltip',
      ),
    ).toBe(true);
    expect(
      getComponent(rules, 'src/Renamed.vue')?.findings.some(
        item => item.rule === 'vueuse/v-on-click-outside',
      ),
    ).toBe(true);
    const global = must(
      getComponent(rules, 'src/GlobalDirective.vue')?.findings.find(
        item => item.rule === 'vue-i18n/v-t',
      ),
      described(rules, 'src/GlobalDirective.vue'),
    );
    expect(global.message).toBe(
      'v-t is an object directive. Vapor skips it and the element stays empty',
    );
  });
});

describe('component features', () => {
  const rules = analyze(path.join(fixtures, 'rules'));

  it('lets the feature with components win', () => {
    const findings = getComponent(rules, 'src/Props.vue')?.findings ?? [];
    expect(findings.filter(item => item.rule === 'reka-ui/as-child')).toHaveLength(2);
    expect(findings.filter(item => item.rule === 'reka-ui/as-child-other')).toHaveLength(1);
    expect(
      getComponent(rules, 'src/NamespaceProp.vue')?.findings.some(
        item => item.rule === 'reka-ui/as-child',
      ),
    ).toBe(true);
    expect(
      getComponent(rules, 'src/NamespaceProp.vue')?.findings.some(
        item => item.rule === 'reka-ui/as-child-other',
      ),
    ).toBe(false);
    expect(getComponent(rules, 'src/Forward.vue')?.findings[0]?.rule).toBe('reka-ui/forward-props');
    expect(getComponent(rules, 'src/UnknownProp.vue')?.findings[0]?.rule).toBe('nuxt-ui/as-child');
    expect(getComponent(rules, 'src/UnknownProp.vue')?.interop).toBe('unknown');
  });

  it('records an unresolved tag without a finding', () => {
    const item = getComponent(rules, 'src/Unresolved.vue');
    expect(item?.unresolved).toEqual(['Missing']);
    expect(item?.findings).toEqual([]);
    expect(item?.interop).toBe('ready');
  });

  it('maps vapor-only warnings and shared compiler errors', () => {
    const delegate = getComponent(rules, 'src/Delegate.vue');
    expect(delegate?.interop).toBe('unknown');
    expect(
      delegate?.findings.some(
        item => item.rule === 'vue/compiler' && item.message.includes('delegate'),
      ),
    ).toBe(true);
    const broken = getComponent(rules, 'src/Broken.vue');
    expect(
      broken?.findings.some(
        item =>
          item.rule === 'vue/compiler' &&
          item.message ===
            'The compiler reports this error without Vapor too. The tool cannot tell if Vapor is the cause.',
      ),
    ).toBe(true);
  });
});

describe('library status', () => {
  it('does not treat an unread works fact as ready', () => {
    const root = path.join(fixtures, 'demo');
    const works = analyze(root, { data: demoData('works', 'works') });
    const widget = getComponent(works, 'src/Widget.vue');
    expect(widget?.interop).toBe('unknown');
    expect(widget?.findings.map(item => item.rule).toSorted()).toEqual([
      'demo-ui/label',
      'demo-ui/widget',
    ]);
    expect(widget?.findings.every(item => item.level === 'unknown')).toBe(true);
    const partial = analyze(root, { data: demoData('partial', 'works') });
    expect(getComponent(partial, 'src/Widget.vue')?.interop).toBe('unknown');
    const broken = analyze(root, { data: demoData('unknown', 'broken') });
    expect(
      getComponent(broken, 'src/Widget.vue')?.findings.find(item => item.rule === 'demo-ui/label')
        ?.level,
    ).toBe('error');
    expect(
      getComponent(broken, 'src/Widget.vue')?.findings.find(item => item.rule === 'demo-ui/widget')
        ?.level,
    ).toBe('unknown');
  });
});

describe('readable versions', () => {
  it('notes a newer broken fact and turns a newer works fact into unknown', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-demo-'));
    cpSync(path.join(fixtures, 'demo'), root, { recursive: true });
    installPackage(root, 'demo-ui', { version: '2.0.0' });
    const broken = analyze(root, { data: demoData('broken', 'works') });
    const finding = must(
      getComponent(broken, 'src/Widget.vue')?.findings.find(item => item.rule === 'demo-ui/widget'),
      described(broken, 'src/Widget.vue'),
    );
    expect(finding.level).toBe('error');
    expect(finding.message).toContain('The project has version 2.0.0.');
    expect(finding.package).toEqual({ name: 'demo-ui', verified: '1.0.0', version: '2.0.0' });
    const works = analyze(root, { data: demoData('works', 'works') });
    expect(getComponent(works, 'src/Widget.vue')?.findings[0]?.level).toBe('unknown');
    installPackage(root, 'demo-ui', { version: '1.0.0' });
    expect(analyze(root, { data: demoData('works', 'works') }).components[0]?.findings).toEqual([]);
    installPackage(root, 'demo-ui', { version: 'latest' });
    const unread = analyze(root, { data: demoData('broken', 'works') });
    expect(
      getComponent(unread, 'src/Widget.vue')?.findings.find(item => item.rule === 'demo-ui/widget')
        ?.level,
    ).toBe('error');
    expect(
      getComponent(unread, 'src/Widget.vue')?.findings.find(item => item.rule === 'demo-ui/label')
        ?.level,
    ).toBe('unknown');
  });
});
