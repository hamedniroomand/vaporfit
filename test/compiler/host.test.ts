import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { diagnosticText, loadProjectModules } from '#compiler/host.ts';
import { loadCompiler } from '#compiler/vue-compiler.ts';

function directory(name: string): string {
  return mkdtempSync(path.join(tmpdir(), `vaporfit-${name}-`));
}

describe('compiler host', () => {
  it('reads an error object and a value that has no message', () => {
    expect(
      diagnosticText({ loc: { start: { column: 2, line: 3 } }, message: 'from object' }),
    ).toEqual({ column: 2, line: 3, message: 'from object' });
    expect(diagnosticText(4)).toEqual({
      column: 1,
      line: 1,
      message: 'The compiler reported an error.',
    });
  });

  it('returns null when the project has no Vue compiler', () => {
    expect(loadProjectModules(directory('modules'))).toBeNull();
  });

  it('compiles a file that has no template', () => {
    const root = directory('empty');
    mkdirSync(root, { recursive: true });
    writeFileSync(
      path.join(root, 'package.json'),
      '{ "name": "vaporfit-empty", "private": true }\n',
    );
    const compiled = loadCompiler(root).compile(
      '<script setup>\nconst n = 1;\n</script>\n',
      'App.vue',
      'App',
    );

    expect(compiled.template).toBeNull();
    expect(compiled.code).toBe('');
  });
});
