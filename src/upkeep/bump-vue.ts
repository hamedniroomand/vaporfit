import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { VaporfitError } from '#errors.ts';
import { compareVersions, isVue36OrLater, parseVersion } from '#semver.ts';

import { eachSeries, run } from './command.ts';

/** The Vue packages that vaporfit pins. They always have the same version. */
export const TOOL_PACKAGES = [
  '@vue/compiler-core',
  '@vue/compiler-sfc',
  '@vue/compiler-vapor',
  '@vue/shared',
] as const;

/** The pin that gives the current Vue version of the tool. */
const SOURCE_PIN = '@vue/compiler-sfc';

export interface BumpPlan {
  from: string;
  to: string;
  /** Files that this command changed, relative to the repository root. */
  changed: string[];
  /** Probe folders that get a lockfile update. */
  probes: string[];
  /** Probe folders with a different Vue pin. This command does not change them. */
  skipped: string[];
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`);
}

/** Changes `"name": "from"` to `"name": "to"` for each name. All other text stays the same. */
export function replacePins(
  text: string,
  names: readonly string[],
  from: string,
  to: string,
): string {
  const keys = names.map(name => escapeRegExp(name)).join('|');
  const pattern = new RegExp(`("(?:${keys})"\\s*:\\s*")${escapeRegExp(from)}"`, 'gu');
  return text.replaceAll(pattern, (_match, head: string) => `${head}${to}"`);
}

/** Changes the Vue line of the "Versions" list in a probe README. */
export function replaceReadmeVersion(text: string, from: string, to: string): string {
  return text.replaceAll(
    new RegExp(`^(- \`vue\` )${escapeRegExp(from)}$`, 'gmu'),
    (_match, head: string) => `${head}${to}`,
  );
}

/** Changes the `vue` line of a sample report, for example in the README. */
export function replaceReportVersion(text: string, from: string, to: string): string {
  return text.replaceAll(new RegExp(`^vue ${escapeRegExp(from)}$`, 'gmu'), `vue ${to}`);
}

/**
 * Removes the Vue packages of one version from `minimumReleaseAgeExclude`.
 * pnpm adds them when a version is new. They are not necessary after the bump.
 */
export function pruneReleaseAgeExclude(text: string, version: string): string {
  const entry = new RegExp(
    `^[ \\t]*-[ \\t]*(['"]?)(?:vue|@vue/[\\w-]+)@${escapeRegExp(version)}\\1[ \\t]*\\r?\\n?`,
    'gmu',
  );
  const pruned = text.replaceAll(entry, '');
  // A key with no items is null in YAML. Remove the key when its list is empty.
  return pruned.replace(/^minimumReleaseAgeExclude:[ \t]*\r?\n(?![ \t]*-)/mu, '');
}

function readJson(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new VaporfitError(`${file}: the file is not a JSON object`);
  }
  return value as Record<string, unknown>;
}

function dependencyOf(manifest: Record<string, unknown>, name: string): string | null {
  const dependencies = manifest.dependencies;
  if (typeof dependencies !== 'object' || dependencies === null) return null;
  const value = (dependencies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : null;
}

/** The Vue version that the tool pins now. */
export function currentVue(repoRoot: string): string {
  const file = path.join(repoRoot, 'package.json');
  const version = dependencyOf(readJson(file), SOURCE_PIN);
  if (version === null) throw new VaporfitError(`${file}: ${SOURCE_PIN} is not a dependency`);
  return version;
}

function probeFolders(repoRoot: string): string[] {
  const folder = path.join(repoRoot, 'repros');
  return readdirSync(folder, { withFileTypes: true })
    .filter(
      entry => entry.isDirectory() && existsSync(path.join(folder, entry.name, 'package.json')),
    )
    .map(entry => path.join('repros', entry.name))
    .toSorted();
}

function editFile(
  repoRoot: string,
  relative: string,
  edit: (text: string) => string,
  changed: string[],
): void {
  const file = path.join(repoRoot, relative);
  if (!existsSync(file)) return;
  const before = readFileSync(file, 'utf8');
  const after = edit(before);
  if (after === before) return;
  writeFileSync(file, after);
  changed.push(relative);
}

function checkTarget(from: string, to: string): void {
  if (parseVersion(to) === null || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(to)) {
    throw new VaporfitError(`"${to}" is not an exact version, for example 3.6.0-rc.16`);
  }
  if (!isVue36OrLater(to)) {
    throw new VaporfitError(`${to} is older than Vue 3.6. Vapor needs Vue 3.6 or later`);
  }
  if (compareVersions(to, from) === 0) {
    throw new VaporfitError(`vaporfit already pins Vue ${from}`);
  }
}

/**
 * Changes the Vue version in the tool pins, in each probe pin, in each probe README, and in the
 * sample report of the README. That sample is the report of a probe.
 * It does not change data/, the test fixtures or the upstream reports.
 * It does not install packages.
 */
export function bumpFiles(repoRoot: string, to: string): BumpPlan {
  const from = currentVue(repoRoot);
  checkTarget(from, to);
  const changed: string[] = [];
  const probes: string[] = [];
  const skipped: string[] = [];
  const prune = (text: string): string => pruneReleaseAgeExclude(text, from);

  editFile(repoRoot, 'package.json', text => replacePins(text, TOOL_PACKAGES, from, to), changed);
  editFile(repoRoot, 'pnpm-workspace.yaml', prune, changed);
  editFile(repoRoot, 'README.md', text => replaceReportVersion(text, from, to), changed);

  for (const probe of probeFolders(repoRoot)) {
    const pin = dependencyOf(readJson(path.join(repoRoot, probe, 'package.json')), 'vue');
    if (pin === null) continue;
    if (pin !== from) {
      skipped.push(`${probe} (vue ${pin})`);
      continue;
    }
    const manifest = path.join(probe, 'package.json');
    editFile(repoRoot, manifest, text => replacePins(text, ['vue'], from, to), changed);
    editFile(
      repoRoot,
      path.join(probe, 'README.md'),
      text => replaceReadmeVersion(text, from, to),
      changed,
    );
    editFile(repoRoot, path.join(probe, 'pnpm-workspace.yaml'), prune, changed);
    probes.push(probe);
  }
  return { changed, from, probes, skipped, to };
}

async function assertPublished(version: string): Promise<void> {
  const response = await globalThis.fetch(`https://registry.npmjs.org/vue/${version}`);
  if (response.status === 404) throw new VaporfitError(`vue ${version} is not on npm`);
  if (!response.ok) throw new VaporfitError(`npm returned ${response.status} for vue ${version}`);
}

function report(plan: BumpPlan): string {
  const lines = [
    `Vue ${plan.from} -> ${plan.to}`,
    `Changed ${plan.changed.length} files and ${plan.probes.length} probe lockfiles.`,
  ];
  if (plan.skipped.length > 0) {
    lines.push(
      'Probes with a different Vue pin (not changed):',
      ...plan.skipped.map(item => `- ${item}`),
    );
  }
  lines.push(
    '',
    'This command does not change data/. Next steps:',
    '1. vp run repros. A probe result that changed needs a person.',
    '2. vp check and vp test.',
    '3. Change verified.vue in data/ only for the rows that the probes verified.',
  );
  return `${lines.join('\n')}\n`;
}

/** `vp run bump-vue <version>`. */
export async function runBumpVue(): Promise<void> {
  const repoRoot = path.resolve(import.meta.dirname, '../..');
  const argv = process.argv.slice(2);
  try {
    const to = argv[0];
    if (to === undefined || argv.length !== 1) {
      throw new VaporfitError('Usage: vp run bump-vue <version>, for example 3.6.0-rc.16');
    }
    checkTarget(currentVue(repoRoot), to);
    await assertPublished(to);
    const plan = bumpFiles(repoRoot, to);
    await run('vp', ['install'], repoRoot);
    await eachSeries(plan.probes, async probe => {
      await run('vp', ['install', '--lockfile-only'], path.join(repoRoot, probe));
    });
    process.stdout.write(report(plan));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'the Vue bump failed';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
