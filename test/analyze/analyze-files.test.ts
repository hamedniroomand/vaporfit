import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, analyzeFiles } from '#index.ts';

const fixture = path.join(import.meta.dirname, '../fixtures/shadcn');

function copyFixture(): string {
  const root = path.join(tmpdir(), `vaporfit-files-${Date.now()}`);
  mkdirSync(root, { recursive: true });
  cpSync(path.join(fixture, 'src'), path.join(root, 'src'), { recursive: true });
  cpSync(path.join(fixture, 'package.json'), path.join(root, 'package.json'));
  symlinkSync(path.join(fixture, 'node_modules'), path.join(root, 'node_modules'));
  writeFileSync(path.join(root, 'src/Other.vue'), '<template><p>other</p></template>\n');
  return root;
}

function changeLists(ids: string[]): string[][] {
  const lists = [[], ['src/Other.vue'], ids.slice(0, 1), ids.slice()];
  for (let index = 0; index < ids.length; index += 1) {
    lists.push(ids.filter((_id, item) => (item + index) % 3 !== 0));
  }
  return lists;
}

describe('analyzeFiles', () => {
  it('matches a full analyze for random change lists', () => {
    const root = copyFixture();
    const previous = analyze(root);
    const ids = previous.components.map(component => component.id);
    expect(ids.length).toBeGreaterThan(1);
    for (const changed of changeLists(ids)) {
      expect(analyzeFiles(root, changed, previous)).toEqual(analyze(root));
    }
    const home = path.join(root, 'src/pages/Home.vue');
    const source = readFileSync(home, 'utf8').replaceAll('as-child', 'class');
    writeFileSync(home, source);
    const full = analyze(root);
    expect(full.summary).not.toEqual(previous.summary);
    expect(analyzeFiles(root, ['src/pages/Home.vue'], previous)).toEqual(full);
  });
});

describe('analyzeFiles across files', () => {
  it('updates a parent that reaches the file through components.d.ts', () => {
    const root = writeProject({
      'components.d.ts': `export {}
declare module 'vue' {
  export interface GlobalComponents {
    Button: typeof import('./src/Button.vue')['default']
  }
}
`,
      'src/Button.vue': `<script setup>
import { Primitive } from 'reka-ui';
const props = defineProps({ asChild: Boolean });
</script>
<template><Primitive v-bind="props"><slot /></Primitive></template>
`,
      'src/Page.vue': `<script setup></script>
<template><Button as-child>Open</Button></template>
`,
    });
    const previous = analyze(root);
    writeFileSync(
      path.join(root, 'src/Button.vue'),
      `<script setup></script>\n<template><button><slot /></button></template>\n`,
    );
    expect(analyzeFiles(root, ['src/Button.vue'], previous)).toEqual(analyze(root));
  });
});

describe('analyzeFiles ref edges', () => {
  it('keeps a Nuxt ref finding when only the target file is listed', () => {
    const root = copyProject(path.join(import.meta.dirname, '../fixtures/nuxt-tags'));
    writeFileSync(
      path.join(root, 'src/Page.vue'),
      `<script setup>\nimport { ref } from 'vue';\nconst box = ref(null);\n</script>\n<template>\n\t<Widget ref="box" />\n\t<p>{{ box.$el }}</p>\n</template>\n`,
    );
    const previous = analyze(root);
    writeFileSync(
      path.join(root, 'src/Widget.vue'),
      `<script setup>\nconst label = 'next';\n</script>\n<template><p>{{ label }}</p></template>\n`,
    );
    expect(analyzeFiles(root, ['src/Widget.vue'], previous)).toEqual(analyze(root));
  });

  it('clears a ref finding on the child after the parent drops the ref', () => {
    const root = copyProject(path.join(import.meta.dirname, '../fixtures/refs'));
    const previous = analyze(root);
    writeFileSync(
      path.join(root, 'src/Parent.vue'),
      `<script setup>\nconst label = 'parent';\n</script>\n<template><p>{{ label }}</p></template>\n`,
    );
    expect(analyzeFiles(root, ['src/Parent.vue'], previous)).toEqual(analyze(root));
  });
});

function copyProject(source: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-files-'));
  cpSync(source, root, { recursive: true });
  return root;
}

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-files-'));
  const entries = {
    'package.json': '{"name":"vaporfit-files","private":true}\n',
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}
