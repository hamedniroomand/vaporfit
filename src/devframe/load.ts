import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { UiServer } from './host.ts';

export interface ReportHost {
  startUi: (root: string, open: boolean) => Promise<UiServer>;
  writeReport: (root: string, outDir: string) => Promise<void>;
}

/** Loads the UI host. The built file contains Devframe. The check command does not load it. */
export async function loadHost(): Promise<ReportHost> {
  const bundled = bundledHost();
  if (bundled !== undefined) return (await import(pathToFileURL(bundled).href)) as ReportHost;
  return import('./host.ts');
}

function bundledHost(): string | undefined {
  if (import.meta.url.includes('/src/devframe/')) return undefined;
  let dir = import.meta.dirname;
  for (let hop = 0; hop < 4; hop += 1) {
    const file = path.join(dir, 'host', 'host.mjs');
    if (existsSync(file)) return file;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}
