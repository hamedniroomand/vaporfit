import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { installLibrary } from '#test/analyze/pure-fixture.ts';
import { captureIo } from '#test/capture.ts';

const blockedSource = `<script setup>
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

function project(name: string, files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), `vaporfit-cli-${name}-`));
  for (const [file, source] of Object.entries(files)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  return root;
}

function withPlugin(files: Record<string, string>): string {
  return project('exit', {
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
    'package.json': '{ "name": "vaporfit-cli-exit", "private": true }\n',
    'src/main.js':
      "import { createApp, vaporInteropPlugin } from 'vue';\nimport App from './App.vue';\ncreateApp(App).use(vaporInteropPlugin).mount('#app');\n",
    ...files,
  });
}

describe('exit codes', () => {
  it('exits 0 for a blocked component that does not have vapor', () => {
    const root = withPlugin({ 'src/App.vue': blockedSource });
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
  });

  it('exits 1 when that component has vapor', () => {
    const root = withPlugin({
      'src/App.vue': blockedSource.replace('<script setup>', '<script setup vapor>'),
    });
    const io = captureIo(root);
    expect(run([], io)).toBe(1);
  });

  it('exits 1 for a blocked component when --strict is set', () => {
    const root = withPlugin({ 'src/App.vue': blockedSource });
    const io = captureIo(root);
    expect(run(['--strict'], io)).toBe(1);
  });

  it('exits 1 when the plugin finding is an error', () => {
    const root = path.join(import.meta.dirname, '../fixtures/plugin-error');
    const io = captureIo(root);
    expect(run([], io)).toBe(1);
  });

  it('exits 0 when the plugin finding is a note', () => {
    const root = path.join(import.meta.dirname, '../fixtures/plugin-note');
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
  });

  it('exits 2 for an unknown flag, a missing root, and a missing package.json', () => {
    const unknown = captureIo(process.cwd());
    expect(run(['--bogus'], unknown)).toBe(2);
    expect(unknown.errors()).toContain('Unknown option');

    const missingRoot = captureIo(process.cwd());
    expect(run(['--root', path.join(tmpdir(), 'vaporfit-missing-root')], missingRoot)).toBe(2);
    expect(missingRoot.errors()).toContain('root');

    const bare = project('bare', { 'src/App.vue': '<template><p>ok</p></template>\n' });
    const missingPackage = captureIo(bare);
    expect(run(['--root', bare], missingPackage)).toBe(2);
    expect(missingPackage.errors()).toContain('package.json');
  });
});

describe('exit codes and the pure tier', () => {
  it('exits 0 when a component that has vapor renders a blocked VDOM child', () => {
    const root = withPlugin({
      'src/App.vue':
        "<script setup vapor>\nimport Child from './Child.vue';\n</script>\n<template>\n  <Child />\n</template>\n",
      'src/Child.vue': blockedSource,
    });
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
  });

  it('exits 0 when a component that has vapor renders a library component', () => {
    const root = withPlugin({
      'src/App.vue':
        "<script setup vapor>\nimport { Button } from 'demo-lib';\n</script>\n<template>\n  <Button />\n</template>\n",
    });
    installLibrary(root, 'demo-lib', '1.2.3', 'export const Button = {}\n');
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
  });
});
