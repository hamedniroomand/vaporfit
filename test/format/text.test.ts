import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

const readySentence =
  '"ready" means that vaporfit found no known problem. It does not test behavior.';

describe('text report header', () => {
  it('puts the plugin finding before the header and omits it when the plugin is installed', () => {
    const note = captureIo(path.join(import.meta.dirname, '../fixtures/plugin-note'));
    expect(run([], note)).toBe(0);
    const text = note.output();
    const pluginAt = text.indexOf('The app entry does not have vaporInteropPlugin.');
    const headerAt = text.indexOf('vaporfit 0.0.0');
    expect(pluginAt).toBeGreaterThanOrEqual(0);
    expect(headerAt).toBeGreaterThan(pluginAt);
    expect(text).toContain('vue 3.5.45\ncompiler 3.6.0-rc.14 from vaporfit\n');
    expect(text).toContain('data 2026-11-10');
    expect(text).toContain('components 1');
    expect(text).toContain('plugin not-installed');
    expect(text.split('Vue libraries with data:').length - 1).toBe(2);
    expect(text.split('Vue libraries with no data:').length - 1).toBe(2);
    expect(text).toContain('Holds back the most components');
    expect(text).toContain('src/App.vue');
    expect(text).toContain('interop 1 ready 0 blocked 0 unknown');
    expect(text).toContain('pure 1 ready 0 blocked 0 unknown');
    expect(text).toContain('Keeps the VDOM runtime');
    expect(text.trimEnd().endsWith(readySentence)).toBe(true);

    const installed = captureIo(path.join(import.meta.dirname, '../fixtures/plugin-installed'));
    expect(run([], installed)).toBe(0);
    expect(installed.output()).not.toContain('does not have vaporInteropPlugin');
    expect(installed.output()).not.toContain('cannot tell');
    expect(installed.output()).toContain('plugin installed');
  });
});

describe('text report findings', () => {
  it('lists silent failures before other findings', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-text-'));
    const files: Record<string, string> = {
      'index.html':
        '<!doctype html><html><body><script type="module" src="/src/main.js"></script></body></html>\n',
      'package.json': '{ "name": "vaporfit-text", "private": true }\n',
      'src/Blocked.vue': `<script setup>
const vMark = { mounted(el) { el.textContent = 'ran'; } };
</script>
<template><p v-mark>text</p></template>
`,
      'src/Unknown.vue': `<script setup>
</script>
<template><p>{{ $label }}</p></template>
`,
      'src/main.js':
        "import { createApp, vaporInteropPlugin } from 'vue';\nimport App from './Blocked.vue';\ncreateApp(App).use(vaporInteropPlugin).mount('#app');\n",
    };
    for (const [file, source] of Object.entries(files)) {
      const full = path.join(root, file);
      mkdirSync(path.dirname(full), { recursive: true });
      writeFileSync(full, source);
    }
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
    const text = io.output();
    const silent = text.indexOf('An object directive is skipped in a Vapor template.');
    const other = text.indexOf('The name $label is not a binding of this file.');
    expect(silent).toBeGreaterThanOrEqual(0);
    expect(other).toBeGreaterThan(silent);
    expect(text.indexOf('Holds back the most components')).toBeGreaterThan(other);
  });
});

function shadcnRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-shadcn-'));
  const source = path.join(import.meta.dirname, '../fixtures/shadcn');
  cpSync(source, root, {
    filter: from => !from.split(path.sep).includes('node_modules'),
    recursive: true,
  });
  const directory = path.join(root, 'node_modules', 'reka-ui');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(directory, 'package.json'),
    JSON.stringify({ name: 'reka-ui', version: '2.11.0' }),
  );
  return root;
}

describe('shadcn text report', () => {
  it('prints the as-child findings and the coverage line', () => {
    const root = shadcnRoot();
    const io = captureIo(root);
    expect(run([], io)).toBe(0);
    const text = io.output();
    expect(text).toContain('as-child does not pass attributes or listeners');
    expect(text).toContain('reka-ui');
    expect(text).toContain('Vue libraries with data: 1');
    expect(text).toContain('src/pages/Home.vue');
    expect(text.indexOf('The tool cannot tell if the app has vaporInteropPlugin.')).toBeLessThan(
      text.indexOf('vaporfit 0.0.0'),
    );
  });
});

describe('text report marks', () => {
  it('marks a library with data that is more than 30 days old as stale', () => {
    vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
    try {
      const io = captureIo(shadcnRoot());
      expect(run([], io)).toBe(0);
      expect(io.output()).toContain('Vue libraries with data: 1\nreka-ui stale\n');
    } finally {
      vi.useRealTimers();
    }
  });

  it('has no compiler line when the tool uses the compiler of the project', () => {
    const io = captureIo(path.join(import.meta.dirname, '../fixtures/shadcn'));
    expect(run([], io)).toBe(0);
    expect(io.output()).not.toContain('from vaporfit');
    expect(io.output()).toContain('Vue libraries with data: 1\nreka-ui\n');
  });
});

describe('JSON report', () => {
  it('prints the analyze report with finding ids', () => {
    const root = path.join(import.meta.dirname, '../fixtures/shadcn');
    const io = captureIo(root);
    expect(run(['--json'], io)).toBe(0);
    const report = JSON.parse(io.output()) as {
      schemaVersion: number;
      components: { findings: { id: string; message: string }[] }[];
    };
    expect(report.schemaVersion).toBe(0);
    expect(JSON.stringify(report)).toContain('"pure"');
    const ids = report.components.flatMap(component =>
      component.findings.map(finding => finding.id),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => /^vf_[0-9a-f]{10}$/u.test(id))).toBe(true);
    const again = captureIo(root);
    expect(run(['--json'], again)).toBe(0);
    expect(again.output()).toBe(io.output());
  });
});
