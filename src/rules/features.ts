import type { VueCompiler } from '#compiler/vue-compiler.ts';
import type { CompatData, Failure, Feature, Library } from '#data/types.ts';
import { packageNameOf } from '#project/manifest.ts';
import type { Project } from '#project/project.ts';
import type { Level, PackageCause } from '#report/types.ts';
import { compareVersions } from '#semver.ts';

import { versionNote } from './messages.ts';

export interface FeatureHit {
  feature: Feature;
  library: Library;
}

export interface FeatureDecision {
  rule: string;
  level: Level;
  failure: Failure;
  message: string;
  evidence: Feature['evidence'];
  package: PackageCause;
  chain: string[];
}

type NameCase = Pick<VueCompiler, 'camelize' | 'capitalize'>;

export interface PropUse {
  source: string;
  component: string;
  prop: string;
}

export function libraryForSource(data: CompatData, source: string): Library | undefined {
  const packageName = packageNameOf(source);
  return data.libraries.find(library => library.package === packageName);
}

/** The script name of a directive: `v-my-directive` gives `vMyDirective`. */
export function directiveBinding(name: string, names: NameCase): string {
  return `v${names.capitalize(names.camelize(name))}`;
}

export function sameProp(left: string, right: string, names: NameCase): boolean {
  return names.camelize(left) === names.camelize(right);
}

export function sameComponent(left: string, right: string, names: NameCase): boolean {
  const pascal = (value: string): string => names.capitalize(names.camelize(value));
  return left === right || pascal(left) === right || pascal(left) === pascal(right);
}

export function importedDirectiveHits(
  data: CompatData,
  source: string,
  imported: string,
): FeatureHit[] {
  const library = libraryForSource(data, source);
  if (!library) return [];
  return library.features
    .filter(feature => {
      if (feature.match.kind !== 'directive') return false;
      if (!sourceMatches(source, feature.match.from)) return false;
      return feature.match.export === imported;
    })
    .map(feature => ({ feature, library }));
}

export function globalDirectiveHits(
  data: CompatData,
  installed: ReadonlySet<string>,
  directiveName: string,
): FeatureHit[] {
  const hits: FeatureHit[] = [];
  for (const library of data.libraries) {
    if (!installed.has(library.package)) continue;
    for (const feature of library.features) {
      if (feature.match.kind === 'directive' && feature.match.name === directiveName) {
        hits.push({ feature, library });
      }
    }
  }
  return hits;
}

/** Features of the data that match one prop. A feature for named components wins. */
export function propHits(project: Project, use: PropUse): FeatureHit[] {
  const { compiler } = project;
  const { component, prop, source } = use;
  const library = libraryForSource(project.data, source);
  if (!library) return [];
  const matches = library.features.filter(feature => {
    if (feature.match.kind !== 'prop') return false;
    if (!sourceMatches(source, feature.match.from) && feature.match.from !== library.package)
      return false;
    if (!sameProp(prop, feature.match.name, compiler)) return false;
    if (feature.match.components === undefined) return true;
    return feature.match.components.some(name => sameComponent(component, name, compiler));
  });
  const specific = matches.filter(
    feature => feature.match.kind === 'prop' && feature.match.components !== undefined,
  );
  const chosen = specific.length > 0 ? specific : matches;
  return chosen.map(feature => ({ feature, library }));
}

export function propNames(data: CompatData): string[] {
  const names = new Set<string>();
  for (const library of data.libraries) {
    for (const feature of library.features) {
      if (feature.match.kind === 'prop') names.add(feature.match.name);
    }
  }
  return [...names];
}

export function importHits(data: CompatData, source: string, imported: string): FeatureHit[] {
  const library = libraryForSource(data, source);
  if (!library) return [];
  return library.features
    .filter(feature => {
      if (feature.match.kind !== 'import') return false;
      if (!sourceMatches(source, feature.match.from)) return false;
      return feature.match.names.includes(imported);
    })
    .map(feature => ({ feature, library }));
}

export function globalPropertyHits(
  data: CompatData,
  installed: ReadonlySet<string>,
  name: string,
): FeatureHit[] {
  const hits: FeatureHit[] = [];
  for (const library of data.libraries) {
    if (!installed.has(library.package)) continue;
    for (const feature of library.features) {
      if (feature.match.kind === 'globalProperty' && feature.match.names.includes(name)) {
        hits.push({ feature, library });
      }
    }
  }
  return hits;
}

/** A `works` fact gives no finding only when the installed version is readable and not newer. */
export function decideFeature(
  hit: FeatureHit,
  version: string | null,
  file: string,
): FeatureDecision | null {
  const { feature, library } = hit;
  const compared = version === null ? null : compareVersions(version, library.verified.version);
  const newer = compared === 1;
  if (feature.status === 'works' && compared !== null && !newer) return null;
  const level: Level = feature.status === 'broken' ? 'error' : 'unknown';
  const note = newer && version !== null ? versionNote(library.verified.version, version) : '';
  return {
    chain: [file, library.package],
    evidence: feature.evidence,
    failure: feature.failure,
    level,
    message: `${feature.message}${note}`,
    package: { name: library.package, verified: library.verified.version, version },
    rule: feature.id,
  };
}

function sourceMatches(importSource: string, featureFrom: string): boolean {
  return importSource === featureFrom || importSource.startsWith(`${featureFrom}/`);
}
