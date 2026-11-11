import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createServer } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import { vaporfit } from '#devtools.ts';

const fixture = path.join(import.meta.dirname, '../fixtures/vite-panel');

describe('vite panel', () => {
  it('registers the plugin name in a Vite 8.3 fixture', async () => {
    const manifest = JSON.parse(readFileSync(path.join(fixture, 'package.json'), 'utf8')) as {
      devDependencies: { vite: string };
    };
    const source = readFileSync(path.join(fixture, 'vite.config.ts'), 'utf8');
    expect(manifest.devDependencies.vite).toBe('8.3.7');
    expect(source).toContain('devtools: true');
    expect(source).toContain('vaporfit()');
    const server = await createServer({
      configFile: false,
      logLevel: 'error',
      plugins: [vaporfit({ root: fixture })],
      root: fixture,
      server: { middlewareMode: true },
    });
    expect(server.config.plugins.map(plugin => plugin.name)).toContain('vaporfit');
    await server.close();
  });
});
