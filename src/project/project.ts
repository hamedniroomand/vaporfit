import path from 'node:path';

import type { VueCompiler } from '#compiler/vue-compiler.ts';
import { loadCompiler } from '#compiler/vue-compiler.ts';
import { loadData } from '#data/load.ts';
import type { CompatData } from '#data/types.ts';
import { packageRoot } from '#package-root.ts';

import type { Manifest } from './manifest.ts';
import { dependencyNames, readInstalledPackage, readManifest } from './manifest.ts';

export interface Project {
  root: string;
  manifest: Manifest;
  data: CompatData;
  compiler: VueCompiler;
  installed: ReadonlySet<string>;
  /** The installed version of a package, or null. Each package is read one time. */
  versionOf: (name: string) => string | null;
}

export function openProject(root: string, data?: CompatData): Project {
  const projectRoot = path.resolve(root);
  // The compiler loads first, then the data, then the manifest. The first error is the one shown.
  const compiler = loadCompiler(projectRoot);
  const compatData = data ?? loadData(path.join(packageRoot(), 'data'));
  const manifest = readManifest(projectRoot);
  return {
    compiler,
    data: compatData,
    installed: new Set(dependencyNames(manifest)),
    manifest,
    root: projectRoot,
    versionOf: versionReader(projectRoot),
  };
}

function versionReader(root: string): (name: string) => string | null {
  const cache = new Map<string, string | null>();
  return name => {
    const known = cache.get(name);
    if (known !== undefined) return known;
    const version = readInstalledPackage(root, name)?.version ?? null;
    cache.set(name, version);
    return version;
  };
}
