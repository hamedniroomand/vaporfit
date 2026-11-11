import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';

import { described, must, textAt } from './assert.ts';

const fixtures = path.join(import.meta.dirname, '../fixtures');

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-wp4-'));
  const entries = {
    'package.json': '{"name":"vaporfit-wp4","private":true}\n',
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe('refs from other files', () => {
  it('reports a template ref on the parent and the child', () => {
    const root = path.join(fixtures, 'refs');
    const report = analyze(root);
    const parent = getComponent(report, 'src/Parent.vue');
    const child = getComponent(report, 'src/Child.vue');
    const parentFinding = must(
      parent?.findings.find(item => item.rule === 'vapor/component-ref-instance'),
      described(report, 'src/Parent.vue'),
    );
    const childFinding = must(
      child?.findings.find(item => item.rule === 'vapor/component-ref-instance'),
      described(report, 'src/Child.vue'),
    );
    expect(parent?.interop).toBe('blocked');
    expect(child?.interop).toBe('blocked');
    expect(parentFinding.level).toBe('error');
    expect(childFinding.level).toBe('error');
    expect(parentFinding.chain).toEqual(['src/Parent.vue', 'src/Child.vue']);
    expect(childFinding.chain).toEqual(['src/Parent.vue', 'src/Child.vue']);
    expect(textAt(path.join(root, 'src/Parent.vue'), parentFinding, '$el'.length)).toBe('$el');
  });
});

describe('dynamic component refs', () => {
  it('marks a dynamic component ref unknown', () => {
    const root = writeProject({
      'src/Parent.vue': `<script setup>
import { ref } from 'vue';
import Child from './Child.vue';
const box = ref(null);
</script>
<template>
  <component :is="Child" ref="box" />
  <p>{{ box.$el }}</p>
</template>
`,
      'src/Child.vue': `<script setup></script>
<template><p>child</p></template>
`,
    });
    const report = analyze(root);
    const child = getComponent(report, 'src/Child.vue');
    const parent = getComponent(report, 'src/Parent.vue');
    expect(child?.interop).toBe('unknown');
    expect(parent?.interop).toBe('unknown');
    expect(child?.findings[0]?.level).toBe('unknown');
    expect(child?.findings[0]?.message).toContain('cannot find all users');
    expect(child?.findings[0]?.message.toLowerCase()).not.toContain('safe');
    expect(child?.findings[0]?.chain).toEqual(['src/Parent.vue', 'src/Child.vue']);
  });
});

describe('tag resolution', () => {
  it('resolves Nuxt components from .nuxt/components.d.ts without an unknown finding', () => {
    const root = path.join(fixtures, 'nuxt-tags');
    const report = analyze(root);
    const page = getComponent(report, 'src/Page.vue');
    expect(page?.unresolved).toEqual([]);
    expect(page?.findings.filter(item => item.level === 'unknown')).toEqual([]);
    expect(page?.interop).toBe('ready');
    expect(getComponent(report, 'src/Widget.vue')?.interop).toBe('ready');
  });
});

describe('components.d.ts tags', () => {
  it('resolves a components.d.ts tag to a package prop', () => {
    const root = writeProject({
      'components.d.ts': `export {}
declare module 'vue' {
  export interface GlobalComponents {
    DialogTrigger: typeof import('reka-ui')['DialogTrigger']
    Widget: typeof import('./src/Widget.vue')['default']
  }
}
`,
      'src/Page.vue': `<script setup></script>
<template>
  <DialogTrigger as-child />
  <Widget />
</template>
`,
      'src/Widget.vue': `<script setup></script>
<template><p>widget</p></template>
`,
    });
    const report = analyze(root);
    const page = getComponent(report, 'src/Page.vue');
    const finding = must(
      page?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/Page.vue'),
    );
    expect(page?.unresolved).toEqual([]);
    expect(page?.interop).toBe('blocked');
    expect(finding.level).toBe('error');
    expect(finding.chain).toEqual(['src/Page.vue', 'reka-ui']);
  });
});

describe('app.component tags', () => {
  it('resolves a literal app.component and marks an unreadable name', () => {
    const root = writeProject({
      'src/main.ts': `import { createApp } from 'vue';
import { DialogTrigger } from 'reka-ui';
import App from './App.vue';
import Secret from './Secret.vue';

const name = 'Secret';
createApp(App).component('DialogTrigger', DialogTrigger);
createApp(App).component(name, Secret);
`,
      'src/App.vue': `<script setup></script>
<template>
  <DialogTrigger as-child />
</template>
`,
      'src/Secret.vue': `<script setup></script>
<template><p>secret</p></template>
`,
    });
    const report = analyze(root);
    const app = getComponent(report, 'src/App.vue');
    const finding = must(
      app?.findings.find(item => item.rule === 'reka-ui/as-child'),
      described(report, 'src/App.vue'),
    );
    const secret = getComponent(report, 'src/Secret.vue');
    expect(app?.unresolved).toEqual([]);
    expect(finding.chain).toEqual(['src/App.vue', 'reka-ui']);
    expect(app?.interop).toBe('blocked');
    expect(secret?.interop).toBe('unknown');
    expect(secret?.findings[0]?.message).toContain('cannot find all users');
    expect(secret?.findings[0]?.message.toLowerCase()).not.toContain('safe');
  });
});
