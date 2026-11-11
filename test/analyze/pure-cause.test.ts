import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';

import { writeProject } from './pure-fixture.ts';

describe('pure cause on a parent', () => {
  it('copies an interop cause to the parent instead of a VDOM sentence', () => {
    const root = writeProject({
      'src/Child.vue': `<script setup vapor>
const vMark = { mounted(el) { el.textContent = 'ran' } }
</script>
<template><p v-mark>text</p></template>
`,
      'src/Parent.vue': `<script setup vapor>
import Child from './Child.vue'
</script>
<template><Child /></template>
`,
    });
    const report = analyze(root);
    const parent = getComponent(report, 'src/Parent.vue');
    const finding = parent?.findings.find(item => item.rule === 'vapor/object-directive');

    expect(parent?.interop).toBe('ready');
    expect(parent?.pure).toBe('blocked');
    expect(finding?.message).not.toContain('VDOM');
    expect(finding?.chain).toEqual(['src/Parent.vue', 'src/Child.vue']);
  });
});

describe('pure cause chain', () => {
  it('does not copy a finding that already names the parent', () => {
    const root = writeProject({
      'src/Child.vue': `<script setup vapor>
const label = 'child'
</script>
<template><p>{{ label }}</p></template>
`,
      'src/Parent.vue': `<script setup vapor>
import { ref } from 'vue'
import Child from './Child.vue'
const box = ref(null)
</script>
<template><Child ref="box" /><p>{{ box.$el }}</p></template>
`,
    });
    const parent = getComponent(analyze(root), 'src/Parent.vue');
    const chains = parent?.findings
      .filter(item => item.rule === 'vapor/component-ref-instance')
      .map(item => item.chain);

    expect(chains).toEqual([['src/Parent.vue', 'src/Child.vue']]);
  });

  it('keeps a parent unknown when its child has an unresolved tag', () => {
    const root = writeProject({
      'src/Child.vue': `<script setup vapor></script>
<template><Missing /></template>
`,
      'src/Parent.vue': `<script setup vapor>
import Child from './Child.vue'
</script>
<template><Child /></template>
`,
    });
    const report = analyze(root);
    const parent = getComponent(report, 'src/Parent.vue');

    expect(getComponent(report, 'src/Child.vue')?.pure).toBe('unknown');
    expect(parent?.pure).toBe('unknown');
    expect(parent?.interop).toBe('ready');
  });
});

describe('pure file kinds', () => {
  it('keeps a component with an interop error out of pure ready', () => {
    const root = writeProject({
      'src/App.vue': `<script setup vapor>
const vMark = { mounted(el) { el.textContent = 'ran' } }
</script>
<template><p v-mark>text</p></template>
`,
    });
    const component = getComponent(analyze(root), 'src/App.vue');

    expect(component?.interop).toBe('blocked');
    expect(component?.pure).toBe('blocked');
  });

  it('blocks a JSX file and a render function', () => {
    const root = writeProject({
      'src/Box.jsx': 'export default function Box() { return null }\n',
      'src/Jsx.vue': `<script setup vapor>
import Box from './Box.jsx'
</script>
<template><Box /></template>
`,
      'src/Render.vue': `<script setup vapor>
const Local = () => 'x'
</script>
<template><Local /></template>
`,
    });
    const report = analyze(root);
    const jsx = getComponent(report, 'src/Jsx.vue');
    const render = getComponent(report, 'src/Render.vue');

    expect(jsx?.pure).toBe('blocked');
    expect(jsx?.findings.some(finding => (finding.chain ?? []).includes('src/Box.jsx'))).toBe(true);
    expect(render?.pure).toBe('blocked');
    expect(render?.findings.some(finding => finding.rule === 'vapor/vdom-component')).toBe(true);
  });
});
