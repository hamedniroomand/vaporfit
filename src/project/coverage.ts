import { buildDate, isStale } from '#data/freshness.ts';
import type { Report } from '#report/types.ts';

import type { InstalledPackage } from './manifest.ts';
import { dependencyNames, readInstalledPackage } from './manifest.ts';
import type { Project } from './project.ts';

export function coverageOf(project: Project): Report['project']['coverage'] {
  const { data, manifest, root } = project;
  const known = new Set(data.libraries.map(library => library.package));
  const withData: string[] = [];
  const withoutData: string[] = [];
  for (const name of dependencyNames(manifest)) {
    if (known.has(name)) {
      withData.push(name);
      continue;
    }
    const installed = readInstalledPackage(root, name);
    if (installed !== null && dependsOnVue(installed)) withoutData.push(name);
  }
  const today = buildDate();
  const stale = data.libraries
    .filter(library => withData.includes(library.package))
    .filter(library => isStale(library.verified.date, today))
    .map(library => library.package);
  return {
    stale: stale.toSorted(),
    withData: withData.toSorted(),
    withoutData: withoutData.toSorted(),
  };
}

function dependsOnVue(installed: InstalledPackage): boolean {
  return installed.dependencies?.vue !== undefined || installed.peerDependencies?.vue !== undefined;
}
