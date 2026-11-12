import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

const composition = `import { createApp, vaporInteropPlugin } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './Hello.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { hello: 'Hello' } },
});

createApp(App).use(vaporInteropPlugin).use(i18n).mount('#app');
`;

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-i18n-edge-'));
  const all: Record<string, string> = {
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
    'package.json': '{ "name": "vaporfit-cli-i18n", "private": true }\n',
    'src/main.js': composition,
    ...files,
  };
  for (const [file, source] of Object.entries(all)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  return root;
}

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('fix --i18n when the rewrite cannot run', () => {
  it('keeps the file when the script already calls useI18n', () => {
    const source = `<script setup>
import { useI18n } from 'vue-i18n';
useI18n();
</script>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;
    const root = writeProject({ 'src/Hello.vue': source });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(source);
    expect(io.output()).toContain('This file calls useI18n.');
  });

  it('keeps the text when the file has no template and the script has $t', () => {
    const source = `<script setup>
const label = '$t';
</script>
`;
    const root = writeProject({ 'src/Hello.vue': source });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toContain("const label = '$t'");
    expect(io.output()).toContain('The tool cannot read the template.');
  });

  it('keeps the file when v-for has no list and the source is $t', () => {
    const source = `<script setup>
</script>
<template>
  <p v-for="$t">{{ $t }}</p>
</template>
`;
    const root = writeProject({ 'src/Hello.vue': source });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(source);
    expect(io.output()).toContain('The tool cannot change a slot pattern.');
  });
});
