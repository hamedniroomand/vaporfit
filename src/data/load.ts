import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { VaporfitError } from '#errors.ts';

import { SCHEMA_VERSION } from './types.ts';
import type { CompatData, Library, Rule } from './types.ts';

type Json = Record<string, unknown>;

const STATUSES = ['works', 'partial', 'broken', 'unknown'];
const FAILURES = ['compile', 'runtime-error', 'silent', 'none'];
const TIERS = ['interop', 'pure'];
const EVIDENCE_LEVELS = ['declared', 'tested', 'issue', 'source'];
const DEPTHS = ['D0', 'D1', 'D2', 'D3'];
const SCOPES = ['full', 'partial', 'interop-only'];
const MATCH_KINDS = ['directive', 'globalProperty', 'prop', 'import'];

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function oneOf(values: string[]): (value: unknown) => boolean {
  return value => typeof value === 'string' && values.includes(value);
}

function check(file: string, field: string, ok: boolean): void {
  if (!ok) {
    throw new VaporfitError(`${file}: the field "${field}" is missing or has the wrong type`);
  }
}

function checkVerified(file: string, value: unknown, withVersion: boolean): void {
  check(file, 'verified', isObject(value));
  const verified = value as Json;
  check(file, 'verified.vue', typeof verified.vue === 'string');
  check(file, 'verified.date', typeof verified.date === 'string');
  if (withVersion) {
    check(file, 'verified.version', typeof verified.version === 'string');
  }
}

function checkEvidence(file: string, field: string, value: unknown): void {
  check(file, field, Array.isArray(value));
  for (const item of value as unknown[]) {
    const entry = `${field}[]`;
    check(file, `${entry}.level`, isObject(item) && oneOf(EVIDENCE_LEVELS)(item.level));
    if (!isObject(item)) {
      continue;
    }
    if (item.level === 'tested') {
      check(file, `${entry}.depth`, oneOf(DEPTHS)(item.depth));
      check(file, `${entry}.environment`, typeof item.environment === 'string');
      check(file, `${entry}.probe`, isNullableString(item.probe));
      if (item.what !== undefined) {
        check(file, `${entry}.what`, typeof item.what === 'string');
      }
    } else if (item.level === 'issue') {
      check(file, `${entry}.url`, typeof item.url === 'string');
      check(file, `${entry}.state`, typeof item.state === 'string');
    } else if (item.level === 'source') {
      check(file, `${entry}.url`, typeof item.url === 'string');
    }
  }
}

function checkMatch(file: string, value: unknown): void {
  check(file, 'features[].match', isObject(value) && oneOf(MATCH_KINDS)(value.kind));
  const match = value as Json;
  if (match.kind === 'directive' || match.kind === 'prop') {
    check(file, 'features[].match.name', typeof match.name === 'string');
  } else {
    check(file, 'features[].match.names', isStrings(match.names));
  }
  if (match.kind !== 'globalProperty') {
    check(file, 'features[].match.from', typeof match.from === 'string');
  }
  if (match.kind === 'directive') {
    check(file, 'features[].match.export', isNullableString(match.export));
  }
  if (match.components !== undefined) {
    check(file, 'features[].match.components', isStrings(match.components));
  }
}

function checkRule(file: string, rule: Json): void {
  check(file, 'id', typeof rule.id === 'string');
  check(file, 'title', typeof rule.title === 'string');
  check(file, 'tiers', isStrings(rule.tiers) && rule.tiers.every(oneOf(TIERS)));
  check(file, 'failure', oneOf(FAILURES)(rule.failure));
  check(file, 'detection', oneOf(['static', 'data', 'none'])(rule.detection));
  check(file, 'fix', isNullableString(rule.fix));
  checkVerified(file, rule.verified, false);
  check(file, 'sources', isStrings(rule.sources));
}

function checkLibrary(file: string, library: Json): void {
  check(file, 'package', typeof library.package === 'string');
  check(file, 'repository', typeof library.repository === 'string');
  checkVerified(file, library.verified, true);
  const { declared, interop, features } = library;
  check(file, 'declared', declared === null || isObject(declared));
  if (isObject(declared)) {
    check(file, 'declared.scope', oneOf(SCOPES)(declared.scope));
    check(file, 'declared.since', isNullableString(declared.since));
    check(file, 'declared.url', typeof declared.url === 'string');
    check(file, 'declared.quote', typeof declared.quote === 'string');
  }
  check(file, 'interop.status', isObject(interop) && oneOf(STATUSES)(interop.status));
  checkEvidence(file, 'interop.evidence', (interop as Json).evidence);
  if (library.pure !== undefined) {
    check(file, 'pure.status', isObject(library.pure) && oneOf(STATUSES)(library.pure.status));
    checkEvidence(file, 'pure.evidence', (library.pure as Json).evidence);
  }
  check(file, 'features', Array.isArray(features));
  for (const feature of features as unknown[]) {
    check(file, 'features[]', isObject(feature));
    const item = feature as Json;
    check(file, 'features[].id', typeof item.id === 'string');
    checkMatch(file, item.match);
    check(file, 'features[].status', oneOf(STATUSES)(item.status));
    check(file, 'features[].failure', oneOf(FAILURES)(item.failure));
    check(file, 'features[].message', typeof item.message === 'string');
    checkEvidence(file, 'features[].evidence', item.evidence);
    check(file, 'features[].fixedIn', isNullableString(item.fixedIn));
  }
  check(file, 'notes', library.notes === undefined || typeof library.notes === 'string');
}

function readFolder(folder: string, checkFile: (file: string, value: Json) => void): Json[] {
  return readdirSync(folder)
    .filter(name => name.endsWith('.json'))
    .toSorted()
    .map(name => {
      const file = path.join(folder, name);
      let value: unknown;
      try {
        value = JSON.parse(readFileSync(file, 'utf8'));
      } catch (error) {
        throw new VaporfitError(`${file}: not valid JSON (${(error as Error).message})`);
      }
      check(file, 'schemaVersion', isObject(value) && value.schemaVersion === SCHEMA_VERSION);
      checkFile(file, value as Json);
      return value as Json;
    });
}

/** Reads the rule files and the library files of a data directory and checks the type of each field. */
export function loadData(dataDirectory: string): CompatData {
  return {
    rules: readFolder(path.join(dataDirectory, 'rules'), checkRule) as unknown as Rule[],
    libraries: readFolder(
      path.join(dataDirectory, 'libraries'),
      checkLibrary,
    ) as unknown as Library[],
  };
}
