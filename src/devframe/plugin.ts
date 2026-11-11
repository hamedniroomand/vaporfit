import process from 'node:process';

import { createPluginFromDevframe } from '@vitejs/devtools-kit/node';
import type { Plugin } from 'vite';

import { createDefinition } from './definition.ts';
import { closeWatchedReports } from './report-state.ts';

/** A Vite plugin. It adds the vaporfit panel to Vite DevTools. */
export function vaporfit(options?: { root?: string }): Plugin {
  let root = options?.root ?? process.cwd();
  const plugin = createPluginFromDevframe(
    createDefinition(() => root, { watch: true }),
    {
      name: 'vaporfit',
    },
  );
  plugin.configureServer = (server): void => {
    server.httpServer?.on('close', () => {
      closeWatchedReports();
    });
  };
  if (options?.root === undefined) {
    plugin.configResolved = (config): void => {
      root = config.root;
    };
  }
  return plugin;
}
