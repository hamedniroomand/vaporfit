import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

const ready = `<script setup>
</script>
<template>
  <p>ok</p>
</template>
`;

const memo = `<script setup>
</script>
<template>
  <div v-memo="[]">text</div>
</template>
`;

const already = `<script setup vapor></script>
<template>
  <div v-memo="[]">text</div>
</template>
`;

const blocked = `<script setup>
const vMark = {
  mounted(el) {
    el.textContent = 'ran';
  },
};
</script>
<template>
  <p v-mark>text</p>
</template>
`;

const unknown = `<script setup>
</script>
<template>
  <p>{{ $label }}</p>
</template>
`;

const templateOnly = `<template>
  <p>only</p>
</template>
`;

function writeProject(plugin: boolean): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-fix-'));
  const files: Record<string, string> = {
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
    'package.json': '{ "name": "vaporfit-cli-fix", "private": true }\n',
    'src/Blocked.vue': blocked,
    'src/Memo.vue': memo,
    'src/Ready.vue': ready,
    'src/Template.vue': templateOnly,
    'src/Unknown.vue': unknown,
    'src/main.js': plugin
      ? "import { createApp, vaporInteropPlugin } from 'vue';\nimport App from './Ready.vue';\ncreateApp(App).use(vaporInteropPlugin).mount('#app');\n"
      : "import { createApp } from 'vue';\nimport App from './Ready.vue';\ncreateApp(App).mount('#app');\n",
  };
  if (plugin) files['src/Already.vue'] = already;
  for (const [file, source] of Object.entries(files)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  return root;
}

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('fix', () => {
  it('does not change a file without --write', () => {
    const root = writeProject(true);
    const before = read(root, 'src/Ready.vue');
    const io = captureIo(root);
    expect(run(['fix'], io)).toBe(0);
    expect(read(root, 'src/Ready.vue')).toBe(before);
    expect(read(root, 'src/Memo.vue')).toBe(memo);
    expect(io.output()).toContain('src/Ready.vue');
  });

  it('adds vapor only on a ready component when the plugin is installed', () => {
    const root = writeProject(true);
    const io = captureIo(root);
    expect(run(['fix', '--write'], io)).toBe(0);
    expect(read(root, 'src/Ready.vue')).toContain('<script setup vapor>');
    expect(read(root, 'src/Template.vue')).toContain('<script setup vapor>');
    expect(read(root, 'src/Memo.vue')).toContain('vapor');
    expect(read(root, 'src/Memo.vue')).not.toContain('v-memo');
    expect(read(root, 'src/Blocked.vue')).toBe(blocked);
    expect(read(root, 'src/Unknown.vue')).toBe(unknown);
    expect(read(root, 'src/Already.vue')).toBe(already);
  });

  it('keeps a generic attribute when it adds vapor', () => {
    const root = writeProject(true);
    const source = `<script setup generic="T extends Record<string, number>">
</script>
<template>
  <p>ok</p>
</template>
`;
    writeFileSync(path.join(root, 'src/Generic.vue'), source);
    const io = captureIo(root);
    expect(run(['fix', '--write'], io)).toBe(0);
    const next = read(root, 'src/Generic.vue');
    expect(next).toContain('generic="T extends Record<string, number>"');
    expect(next).toMatch(/<script setup generic="T extends Record<string, number>" vapor>/u);
  });

  it('does not write when the plugin is not installed', () => {
    const root = writeProject(false);
    const io = captureIo(root);
    expect(run(['fix', '--write'], io)).toBe(0);
    expect(read(root, 'src/Ready.vue')).toBe(ready);
    expect(read(root, 'src/Memo.vue')).toBe(memo);
    expect(io.output()).toContain('src/Ready.vue');
    expect(io.output()).toContain('does not write');
  });
});

describe('fix dry run without the plugin', () => {
  it('gives the reason and does not tell the user to add --write', () => {
    const root = writeProject(false);
    const io = captureIo(root);
    expect(run(['fix'], io)).toBe(0);
    expect(io.output()).toContain('The app entry does not have vaporInteropPlugin.');
    expect(io.output()).not.toContain('Add --write');
  });
});
