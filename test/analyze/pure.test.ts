import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { formatText } from '#format/text.ts';
import { analyze, analyzeFiles, getComponent } from '#index.ts';

import { must, textAt } from './assert.ts';
import { installLibrary, writeProject } from './pure-fixture.ts';

const shadcn = path.join(import.meta.dirname, '../fixtures/shadcn');
const nuxt = path.join(import.meta.dirname, '../fixtures/nuxt-on');

describe('pure verdict', () => {
  it('marks a Vapor parent of a Vapor child pure ready', () => {
    const root = writeProject({
      'src/Child.vue': `<script setup vapor>
const label = 'child'
</script>
<template><p>{{ label }}</p></template>
`,
      'src/Parent.vue': `<script setup vapor>
import Child from './Child.vue'
</script>
<template><Child /></template>
`,
    });
    const report = analyze(root);

    expect(getComponent(report, 'src/Child.vue')?.pure).toBe('ready');
    expect(getComponent(report, 'src/Parent.vue')?.pure).toBe('ready');
    expect(report.summary.pure).toEqual({ blocked: 0, ready: 2, unknown: 0 });
    expect(report.order).toEqual([]);
    expect(report.schemaVersion).toBe(0);
  });
});

describe('pure library chain', () => {
  it('blocks a library file without the marker and copies the chain to the ancestor', () => {
    const root = writeProject({
      'src/Ancestor.vue': `<script setup vapor>
import Parent from './Parent.vue'
</script>
<template><Parent /></template>
`,
      'src/Parent.vue': `<script setup vapor>
import { Button } from 'demo-lib'
</script>
<template><Button /></template>
`,
    });
    installLibrary(root, 'demo-lib', '1.2.3', 'export const Button = {}\n');
    const report = analyze(root);
    const parent = getComponent(report, 'src/Parent.vue');
    const ancestor = getComponent(report, 'src/Ancestor.vue');
    const parentFinding = parent?.findings.find(finding => finding.rule === 'vapor/vdom-component');
    const ancestorFinding = ancestor?.findings.find(
      finding => finding.rule === 'vapor/vdom-component',
    );
    const text = formatText(report);

    expect(parent?.pure).toBe('blocked');
    expect(ancestor?.pure).toBe('blocked');
    expect(parentFinding?.level).toBe('error');
    expect(parentFinding?.chain).toEqual(['src/Parent.vue', 'demo-lib']);
    expect(parentFinding?.package).toEqual({ name: 'demo-lib', verified: '', version: '1.2.3' });
    expect(ancestorFinding?.chain).toEqual(['src/Ancestor.vue', 'src/Parent.vue', 'demo-lib']);
    const parentBlock = must(parentFinding, 'parent vdom finding');
    const ancestorBlock = must(ancestorFinding, 'ancestor vdom finding');
    expect(textAt(path.join(root, 'src/Parent.vue'), parentBlock, 'Button'.length)).toBe('Button');
    expect(textAt(path.join(root, 'src/Ancestor.vue'), ancestorBlock, 'Parent'.length)).toBe(
      'Parent',
    );
    expect(report.order).toEqual(['src/Parent.vue', 'src/Ancestor.vue']);
    expect(report.summary.pure).toEqual({ blocked: 2, ready: 0, unknown: 0 });
    expect(text).toContain('interop 2 ready 0 blocked 0 unknown\npure 0 ready 2 blocked 0 unknown');
    expect(text).toContain('Keeps the VDOM runtime\ndemo-lib 2 no declaration\n');
    expect(text).toContain('Order\nsrc/Parent.vue\nsrc/Ancestor.vue\n');
    expect(report.groups.some(group => group.rule === 'vapor/vdom-component')).toBe(true);
  });
});

describe('pure library marker', () => {
  it('does not block a library file that contains defineVaporComponent', () => {
    const root = writeProject({
      'src/Parent.vue': `<script setup vapor>
import { Button } from 'demo-lib'
</script>
<template><Button /></template>
`,
    });
    installLibrary(root, 'demo-lib', '1.2.3', 'export const Button = defineVaporComponent({})\n');
    const report = analyze(root);
    const parent = getComponent(report, 'src/Parent.vue');

    expect(parent?.pure).toBe('ready');
    expect(parent?.findings.some(finding => finding.rule === 'vapor/vdom-component')).toBe(false);
    expect(report.order).toEqual([]);
  });

  it('marks an unresolved tag pure unknown', () => {
    const root = writeProject({
      'src/App.vue': `<script setup vapor>
</script>
<template><MissingWidget /></template>
`,
    });
    const report = analyze(root);
    const component = getComponent(report, 'src/App.vue');

    expect(component?.pure).toBe('unknown');
    expect(component?.unresolved).toEqual(['MissingWidget']);
    expect(
      component?.findings.some(
        finding => finding.rule === 'vapor/vdom-component' && finding.level === 'error',
      ),
    ).toBe(false);
    expect(report.summary.pure).toEqual({ blocked: 0, ready: 0, unknown: 1 });
    expect(report.order).toEqual(['src/App.vue']);
  });
});

describe('pure unreadable library', () => {
  it('marks an unreadable library file pure unknown', () => {
    const root = writeProject({
      'src/App.vue': `<script setup vapor>
import { Button } from 'missing-lib'
</script>
<template><Button /></template>
`,
    });
    const report = analyze(root);
    const component = getComponent(report, 'src/App.vue');

    expect(component?.pure).toBe('unknown');
    expect(component?.pure).not.toBe('ready');
    expect(
      component?.findings.some(
        finding => finding.rule === 'vapor/vdom-component' && finding.level === 'error',
      ),
    ).toBe(false);
  });
});

describe('pure local child', () => {
  it('does not block a parent of a local file that is pure ready without vapor', () => {
    const root = writeProject({
      'src/Child.vue': `<script setup>
const label = 'child'
</script>
<template><p>{{ label }}</p></template>
`,
      'src/Parent.vue': `<script setup vapor>
import Child from './Child.vue'
</script>
<template><Child /></template>
`,
    });
    const report = analyze(root);
    const child = getComponent(report, 'src/Child.vue');
    const parent = getComponent(report, 'src/Parent.vue');

    expect(child?.vapor).toBe(false);
    expect(child?.pure).toBe('ready');
    expect(parent?.pure).toBe('ready');
    expect(child?.findings.map(finding => finding.message)).toContain(
      'Convert this component first.',
    );
    expect(parent?.findings.filter(finding => finding.level === 'error')).toEqual([]);
    expect(report.order).toEqual([]);
    expect(formatText(report)).toContain('Keeps the VDOM runtime\n\nOrder\n');
  });
});

describe('pure top-level await', () => {
  it('blocks top-level await in script setup', () => {
    const root = writeProject({
      'src/App.vue': `<script setup vapor>
const label = await Promise.resolve('ready')
</script>
<template><p>{{ label }}</p></template>
`,
      'src/Inner.vue': `<script setup vapor>
async function load() {
  await Promise.resolve(1)
}
const label = 'ok'
</script>
<template><p>{{ label }}</p></template>
`,
    });
    const report = analyze(root);
    const component = getComponent(report, 'src/App.vue');
    const finding = component?.findings.find(item => item.rule === 'vapor/async-setup');

    expect(component?.pure).toBe('blocked');
    expect(finding?.level).toBe('error');
    expect(finding?.message).toBe('A top-level await in script setup throws in Vapor.');
    const block = must(finding, 'await finding');
    expect(textAt(path.join(root, 'src/App.vue'), block, 'await'.length)).toBe('await');
    expect(getComponent(report, 'src/Inner.vue')?.pure).toBe('ready');
    expect(report.summary.pure).toEqual({ blocked: 1, ready: 1, unknown: 0 });
  });
});

describe('pure Nuxt project', () => {
  it('does not mark a Nuxt fixture pure ready', () => {
    const report = analyze(nuxt);

    expect(report.components.length).toBeGreaterThan(0);
    expect(report.components.every(component => component.pure !== 'ready')).toBe(true);
    expect(
      report.components.every(component =>
        component.findings.some(finding => finding.rule === 'vapor/nuxt-interop-only'),
      ),
    ).toBe(true);
    expect(getComponent(report, 'src/App.vue')?.interop).toBe('ready');
    expect(getComponent(report, 'src/App.vue')?.findings).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: 'A Nuxt project supports interop mode only.',
        rule: 'vapor/nuxt-interop-only',
      }),
    );
  });
});

describe('pure report on shadcn', () => {
  it('matches analyzeFiles and ranks the libraries that keep the VDOM runtime', () => {
    const report = analyze(shadcn);
    const text = formatText(report);
    const button = report.order.indexOf('src/components/ui/button/Button.vue');
    const home = report.order.indexOf('src/pages/Home.vue');

    expect(report.schemaVersion).toBe(0);
    expect(
      report.summary.pure.ready + report.summary.pure.blocked + report.summary.pure.unknown,
    ).toBe(report.summary.components);
    expect(analyzeFiles(shadcn, ['src/pages/Home.vue'], report)).toEqual(report);
    expect(button).toBeGreaterThanOrEqual(0);
    expect(button).toBeLessThan(home);
    expect(report.order.every(id => getComponent(report, id)?.pure !== 'ready')).toBe(true);
    expect(text).toMatch(
      /interop \d+ ready \d+ blocked \d+ unknown\npure \d+ ready \d+ blocked \d+ unknown/u,
    );
    expect(text.indexOf('interop ')).toBeLessThan(text.indexOf('\npure '));
    expect(text).toContain('Keeps the VDOM runtime');
    expect(text).toMatch(/reka-ui \d+ no declaration/u);
    expect(text).toContain('Order\n');
  });
});

describe('pure note in the ranking', () => {
  it('does not count the note "convert this first" as a cause that holds back', () => {
    const root = writeProject({
      'src/Plain.vue': `<script setup>
const label = 'plain'
</script>
<template><p>{{ label }}</p></template>
`,
    });
    const report = analyze(root);
    const finding = getComponent(report, 'src/Plain.vue')?.findings[0];

    expect(finding).toMatchObject({ level: 'note', rule: 'vapor/vdom-component' });
    expect(report.groups).toEqual([]);
    expect(formatText(report)).toContain(
      'Holds back the most components\n\nKeeps the VDOM runtime',
    );
  });
});
