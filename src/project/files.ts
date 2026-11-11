import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  '.output',
  '.nuxt',
  'coverage',
  '.git',
]);

export function projectFiles(root: string, accept: (name: string) => boolean): string[] {
  const files: string[] = [];
  collect(root, accept, files);
  return files;
}

function collect(directory: string, accept: (name: string) => boolean, files: string[]): void {
  let entries: { name: string; isDirectory: () => boolean; isFile: () => boolean }[];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full, accept, files);
    else if (entry.isFile() && accept(entry.name)) files.push(full);
  }
}

export function vueFiles(root: string): string[] {
  return projectFiles(root, name => name.endsWith('.vue')).toSorted();
}

/** The component id of a file: its path from the project root, with `/` on each platform. */
export function relativeId(root: string, file: string): string {
  return path.relative(root, file).split(path.sep).join('/');
}

/** The Vue file that a relative import points to. The `.vue` extension is optional. */
export function resolveLocal(fromDirectory: string, source: string): string | null {
  if (!source.startsWith('.')) return null;
  const absolute = path.resolve(fromDirectory, source);
  const withVue = absolute.endsWith('.vue') ? absolute : `${absolute}.vue`;
  return existsSync(withVue) ? withVue : null;
}

export function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

export function readText(file: string): string | null {
  try {
    return isFile(file) ? readFileSync(file, 'utf8') : null;
  } catch {
    return null;
  }
}
