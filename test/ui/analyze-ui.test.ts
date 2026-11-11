import path from 'node:path';

import { expect, it } from 'vite-plus/test';

import { analyze } from '#index.ts';

it('accepts the ui folder', () => {
  const report = analyze(path.join(import.meta.dirname, '../../ui'));
  expect(report.schemaVersion).toBe(0);
});
