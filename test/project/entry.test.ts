import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadCompiler } from '#compiler/vue-compiler.ts';
import { readNuxt } from '#project/nuxt.ts';
import { detectPlugin } from '#project/plugin.ts';
import { remember } from '#project/targets.ts';
import type { TagTarget } from '#project/targets.ts';
import { parseModule } from '#syntax/ast.ts';

function directory(name: string): string {
  return mkdtempSync(path.join(tmpdir(), `vaporfit-${name}-`));
}

function write(root: string, file: string, source: string): void {
  const full = path.join(root, file);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, source);
}

function nuxtState(source: string): string {
  const parsed = parseModule(source, 'nuxt.config.ts');
  return readNuxt('nuxt.config.ts', source, parsed.program).state;
}

describe('Nuxt config', () => {
  it('reads a config that is a local object', () => {
    expect(nuxtState('const options = { vue: { vapor: true } };\nexport default options;\n')).toBe(
      'installed',
    );
  });

  it('cannot read a config name that has no object', () => {
    expect(nuxtState('export default missing;\n')).toBe('undetermined');
  });

  it('reads a vue key that is a string', () => {
    expect(nuxtState('export default { "vue": { vapor: false } };\n')).toBe('not-installed');
  });
});

describe('app entry', () => {
  it('uses the conventional entry when the html script file is missing', () => {
    const root = directory('entry');
    write(root, 'index.html', '<script type="module" src="/gone.js"></script>\n');
    write(root, 'src/main.ts', "import { createApp } from 'vue';\ncreateApp({}).mount('#app');\n");

    expect(detectPlugin(root)).toMatchObject({ state: 'not-installed' });
  });

  it('reads an entry from an absolute script src', () => {
    const root = directory('entry');
    write(root, 'index.html', '<script type="module" src="/src/main.ts"></script>\n');
    write(root, 'src/main.ts', 'export const value = 1;\n');

    expect(detectPlugin(root)).toEqual({ location: null, state: 'undetermined' });
  });

  it('reads an entry from a relative script src', () => {
    const root = directory('entry');
    write(root, 'index.html', '<script type="module" src="./src/main.ts"></script>\n');
    write(root, 'src/main.ts', "import { createApp } from 'vue';\ncreateApp({}).mount('#app');\n");

    expect(detectPlugin(root)).toMatchObject({ state: 'not-installed' });
  });
});

describe('tag targets', () => {
  it('keeps the first target of a name', () => {
    const root = directory('targets');
    write(root, 'package.json', '{ "name": "vaporfit-targets", "private": true }\n');
    const map = new Map<string, TagTarget>();
    const compiler = loadCompiler(root);
    const first = { file: 'a.vue', kind: 'file' as const };
    const second = { file: 'b.vue', kind: 'file' as const };

    remember(map, 'my-button', first, compiler);
    remember(map, 'my-button', second, compiler);

    expect(map.get('my-button')).toBe(first);
    expect(map.get('MyButton')).toBe(first);
  });
});
