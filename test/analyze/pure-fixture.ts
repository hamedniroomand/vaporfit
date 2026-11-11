import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-pure-'));
  const entries = {
    'package.json': '{"name":"vaporfit-pure","private":true}\n',
    ...files,
  };
  for (const [name, content] of Object.entries(entries)) {
    const full = path.join(root, name);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

export function installLibrary(root: string, name: string, version: string, source: string): void {
  const directory = path.join(root, 'node_modules', name, 'dist');
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    path.join(root, 'node_modules', name, 'package.json'),
    JSON.stringify({ main: './dist/index.js', name, version }),
  );
  writeFileSync(path.join(directory, 'index.js'), source);
}
