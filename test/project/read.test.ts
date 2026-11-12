import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { projectFiles, readText } from '#project/files.ts';
import { readInstalledPackage, readManifest } from '#project/manifest.ts';

function directory(name: string): string {
  return mkdtempSync(path.join(tmpdir(), `vaporfit-${name}-`));
}

function write(root: string, file: string, source: string): void {
  const full = path.join(root, file);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, source);
}

describe('project files', () => {
  it('skips a path that is not a directory', () => {
    const root = directory('files');
    const file = path.join(root, 'note.txt');
    writeFileSync(file, 'note');

    expect(projectFiles(file, () => true)).toEqual([]);
  });

  it('returns null when the file cannot be read', () => {
    const root = directory('read');
    const file = path.join(root, 'secret.txt');
    writeFileSync(file, 'secret');
    chmodSync(file, 0);
    try {
      expect(readText(file)).toBeNull();
    } finally {
      chmodSync(file, 0o644);
    }
  });
});

describe('package.json', () => {
  it('rejects a file that is not valid JSON', () => {
    const root = directory('manifest');
    write(root, 'package.json', '{');

    expect(() => readManifest(root)).toThrow('package.json is not valid JSON');
  });

  it('rejects a file that is not an object', () => {
    const root = directory('manifest');
    write(root, 'package.json', 'null');

    expect(() => readManifest(root)).toThrow('package.json is not an object.');
  });

  it('rejects an installed package.json that is not valid JSON', () => {
    const root = directory('installed');
    write(root, 'package.json', '{ "name": "app", "private": true }\n');
    write(root, 'node_modules/demo/package.json', '{');

    expect(() => readInstalledPackage(root, 'demo')).toThrow('is not valid JSON');
  });
});
