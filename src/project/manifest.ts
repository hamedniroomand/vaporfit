import { existsSync, readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import path from 'node:path';

import { VaporfitError } from '#errors.ts';

export interface Manifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

export interface InstalledPackage {
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function readManifest(root: string): Manifest {
  const file = path.join(root, 'package.json');
  if (!existsSync(file)) {
    return { dependencies: {}, devDependencies: {}, peerDependencies: {} };
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new VaporfitError(`package.json is not valid JSON (${(error as Error).message}).`);
  }
  if (typeof value !== 'object' || value === null) {
    throw new VaporfitError('package.json is not an object.');
  }
  const manifest = value as Record<string, unknown>;
  return {
    dependencies: stringMap(manifest.dependencies),
    devDependencies: stringMap(manifest.devDependencies),
    peerDependencies: stringMap(manifest.peerDependencies),
  };
}

export function dependencyNames(manifest: Manifest): string[] {
  return [
    ...new Set([
      ...Object.keys(manifest.dependencies),
      ...Object.keys(manifest.devDependencies),
      ...Object.keys(manifest.peerDependencies),
    ]),
  ].toSorted();
}

/** The package name of an import source: `@scope/name/sub` gives `@scope/name`. */
export function packageNameOf(source: string): string {
  if (source.startsWith('@')) {
    const [scope, name] = source.split('/');
    return name !== undefined && name.length > 0 ? `${scope}/${name}` : source;
  }
  return source.split('/')[0] ?? source;
}

export function readInstalledPackage(root: string, name: string): InstalledPackage | null {
  let file: string | undefined;
  try {
    // findPackageJSON also finds a package.json that the exports of the package do not show.
    file = findPackageJSON(name, path.join(root, 'package.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND') return null;
    throw error;
  }
  if (file === undefined) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as InstalledPackage;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new VaporfitError(`${file} is not valid JSON (${error.message}).`);
  }
}

function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') result[key] = item;
  }
  return result;
}
