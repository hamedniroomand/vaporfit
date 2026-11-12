import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, analyzeFiles, getComponent } from '#index.ts';

import { described, must, textAt } from './assert.ts';

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-edges-'));
  const entries = {
    'package.json': '{ "name": "vaporfit-edges", "private": true }\n',
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe('local files', () => {
  it('reads a Vue file when the import has no extension', () => {
    const root = writeProject({
      'src/App.vue': `<script setup>
import Helper from './Helper';
import Missing from './Missing';
</script>
<template>
  <Helper />
  <Missing />
</template>
`,
      'src/Helper.vue': '<template><p>helper</p></template>\n',
    });
    const report = analyze(root);

    expect(report.components.map(item => item.id).toSorted()).toEqual([
      'src/App.vue',
      'src/Helper.vue',
    ]);
    expect(getComponent(report, 'src/App.vue')?.unresolved).toEqual([]);
  });

  it('marks a member tag that is not a namespace as unresolved', () => {
    const root = writeProject({
      'src/App.vue': `<script setup>
import { Foo } from 'pkg';
</script>
<template><Foo.Bar /></template>
`,
    });
    const report = analyze(root);

    expect(getComponent(report, 'src/App.vue')?.unresolved).toContain('Foo.Bar');
  });
});

describe('script refs', () => {
  it('reports a script read of a template ref', () => {
    const root = writeProject({
      'src/Child.vue': '<template><p>child</p></template>\n',
      'src/Parent.vue': `<script setup>
import { ref } from 'vue';
import Child from './Child.vue';
const box = ref(null);
box.value.$el;
</script>
<template>
  <Child ref="box" />
</template>
`,
    });
    const report = analyze(root);
    const parent = must(
      getComponent(report, 'src/Parent.vue')?.findings.find(
        item => item.rule === 'vapor/component-ref-instance',
      ),
      described(report, 'src/Parent.vue'),
    );

    expect(textAt(path.join(root, 'src/Parent.vue'), parent, '$el'.length)).toBe('$el');
    expect(getComponent(report, 'src/Child.vue')?.interop).toBe('blocked');
  });
});

describe('conversion order', () => {
  it('orders a cycle of components that are not pure ready', () => {
    const root = writeProject({
      'src/A.vue': `<script setup>
import B from './B.vue';
</script>
<template><B />{{ $label }}</template>
`,
      'src/B.vue': `<script setup>
import A from './A.vue';
</script>
<template><A />{{ $label }}</template>
`,
    });
    const report = analyze(root);

    expect(report.order.toSorted()).toEqual(['src/A.vue', 'src/B.vue']);
  });
});

describe('component registries', () => {
  it('reads a quoted name and skips a scoped path that has no package', () => {
    const root = writeProject({
      'components.d.ts': `export {}
declare module 'vue' {
  export interface GlobalComponents {
    'MyButton': typeof import('./src/Button.vue')['default']
    0: typeof import('./src/Button.vue')['default']
    Ghost: typeof import('./node_modules/@only')['default']
  }
}
`,
      'src/Button.vue': '<template><button>ok</button></template>\n',
      'src/Page.vue': '<template><MyButton /><Ghost /></template>\n',
    });
    const page = getComponent(analyze(root), 'src/Page.vue');

    expect(page?.unresolved).toEqual(['Ghost']);
  });
});

describe('incremental analyze', () => {
  it('reads the full project when the previous root is different', () => {
    const root = writeProject({ 'src/A.vue': '<template><p>a</p></template>\n' });
    const previous = analyze(root);
    const other = {
      ...previous,
      project: { ...previous.project, root: path.join(root, 'other') },
    };

    expect(analyzeFiles(root, ['src/A.vue'], other)).toEqual(analyze(root));
  });

  it('reads the full project when a changed path is not a Vue file', () => {
    const root = writeProject({ 'src/A.vue': '<template><p>a</p></template>\n' });
    const previous = analyze(root);

    expect(analyzeFiles(root, ['src/A.ts'], previous)).toEqual(analyze(root));
  });
});
