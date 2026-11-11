import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createHostContext } from 'devframe/node';
import { describe, expect, it } from 'vite-plus/test';

import { createDefinition } from '#devframe/definition.ts';
import { tools } from '#devframe/tools.ts';
import { analyze, getComponent } from '#index.ts';

const ready = `<template><p>ok</p></template>\n`;
const blocked = `<script setup>
const vMark = { mounted(el) { el.textContent = 'ran'; } };
</script>
<template><p v-mark>text</p></template>
`;

function writeProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-mcp-'));
  const files: Record<string, string> = {
    'package.json': '{ "name": "vaporfit-mcp", "private": true }\n',
    'src/Blocked.vue': blocked,
    'src/Ready.vue': ready,
    'src/main.js':
      "import { createApp, vaporInteropPlugin } from 'vue';\nimport App from './Ready.vue';\ncreateApp(App).use(vaporInteropPlugin).mount('#app');\n",
  };
  for (const [file, source] of Object.entries(files)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  return root;
}

function hostFor(root: string): Parameters<typeof createHostContext>[0] {
  const state = { mounted: false };
  return {
    cwd: root,
    host: {
      getStorageDir: () => root,
      mountStatic: () => {
        state.mounted = true;
      },
      resolveOrigin: () => 'mcp://vaporfit',
    },
    importMetaUrl: import.meta.url,
    mode: 'dev',
  };
}

describe('mcp tool names', () => {
  it('lists the three read-only tools', async () => {
    const root = writeProject();
    const ctx = await createHostContext(hostFor(root));
    await createDefinition(root).setup(ctx);
    const listed = ctx.agent.list().tools.map(tool => tool.id);
    expect(listed).toEqual(tools.map(tool => tool.id));
    expect(listed).toEqual(['list_components', 'get_component', 'get_summary']);
    expect(ctx.agent.list().tools.every(tool => tool.safety === 'read')).toBe(true);
  });
});

describe('mcp get_component', () => {
  it('returns the same findings as the report for the same file', async () => {
    const root = writeProject();
    const report = analyze(root);
    const component = getComponent(report, 'src/Blocked.vue');
    const ctx = await createHostContext(hostFor(root));
    await createDefinition(root).setup(ctx);
    const result = await ctx.agent.invoke('get_component', { id: 'src/Blocked.vue' });
    expect(result).toMatchObject({
      findings: component?.findings,
      id: 'src/Blocked.vue',
      pure: 'blocked',
      verdict: component?.interop,
    });
  });
});

describe('mcp list and summary', () => {
  it('filters by verdict and returns the report summary', () => {
    const root = writeProject();
    const report = analyze(root);
    const list = tools.find(tool => tool.id === 'list_components');
    const summary = tools.find(tool => tool.id === 'get_summary');
    const readyRows = list?.run(root, { verdict: 'ready' });
    expect(readyRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'src/Ready.vue', pure: 'ready', verdict: 'ready' }),
      ]),
    );
    expect(readyRows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'src/Blocked.vue' })]),
    );
    expect(summary?.run(root, {})).toEqual({
      groups: report.groups,
      project: {
        coverage: report.project.coverage,
        interopPlugin: report.project.interopPlugin,
      },
      summary: report.summary,
    });
  });
});
