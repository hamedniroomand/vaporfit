import path from 'node:path';

import { expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';

import { textAt } from './assert.ts';

const root = path.join(import.meta.dirname, '../fixtures/shadcn');
const pageId = 'src/pages/Home.vue';

it('reports as-child on the page through the local ui wrappers', () => {
  const report = analyze(root);
  const page = getComponent(report, pageId);
  const findings = page?.findings.filter(item => item.rule === 'reka-ui/as-child') ?? [];
  expect(page?.interop).toBe('blocked');
  expect(findings.map(item => item.level)).toEqual(['error', 'error']);
  expect(findings.map(item => item.chain)).toEqual([
    [pageId, 'src/components/ui/dialog/Dialog.vue', 'reka-ui'],
    [pageId, 'src/components/ui/dropdown-menu/DropdownMenu.vue', 'reka-ui'],
  ]);
  for (const finding of findings) {
    expect(textAt(path.join(root, pageId), finding, 'as-child'.length)).toBe('as-child');
  }
});
