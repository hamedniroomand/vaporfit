import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The vaporfit package root. Works from a source file and from a bundled file in `dist`. */
export function packageRoot(): string {
  let directory = import.meta.dirname;
  for (;;) {
    if (isPackageRoot(directory)) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return path.resolve(import.meta.dirname, '..');
    directory = parent;
  }
}

function isPackageRoot(directory: string): boolean {
  const manifest = path.join(directory, 'package.json');
  if (!existsSync(manifest) || !existsSync(path.join(directory, 'data/rules'))) return false;
  const json = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: unknown };
  return json.name === 'vaporfit';
}
