import { existsSync } from 'node:fs';

import { createBuild } from 'devframe/adapters/build';
import { createDevServer } from 'devframe/adapters/dev';

import { VaporfitError } from '#errors.ts';

import { createDefinition } from './definition.ts';
import { uiDirectory } from './paths.ts';
import { closeWatchedReports } from './report-state.ts';

export interface UiServer {
  origin: string;
  close: () => Promise<void>;
}

/** Starts the local report. The first view is a full analyze. File changes use analyzeFiles. */
export async function startUi(root: string, open: boolean): Promise<UiServer> {
  const distDir = requireUi();
  const server = await createDevServer(createDefinition(root, { watch: true }), {
    auth: false,
    distDir,
    host: '127.0.0.1',
    openBrowser: open,
  });
  return {
    origin: server.origin,
    async close(): Promise<void> {
      closeWatchedReports();
      await server.close();
    },
  };
}

export async function writeReport(root: string, outDir: string): Promise<void> {
  const distDir = requireUi();
  await createBuild(createDefinition(root), { distDir, outDir });
}

function requireUi(): string {
  const distDir = uiDirectory();
  if (!existsSync(distDir)) {
    throw new VaporfitError('The UI build is missing.');
  }
  return distDir;
}
