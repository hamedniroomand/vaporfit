import { spawn } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { isNewerVersion } from '#semver.ts';

import { eachSeries, npmDistTags, run } from './command.ts';
import { launchChrome, observeProbe } from './observe-probe.ts';
import type { LibraryFile } from './probes.ts';
import { readLibraries, testedProbePaths } from './probes.ts';
import { planWeeklyUpdate, vueVersionForProbe } from './weekly-plan.ts';
import type { ProbeRun, VueTags, WeeklyPlan } from './weekly-plan.ts';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface SelectedProbe {
  probe: string;
  packageName: string;
  version: string;
}

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

function fail(error: unknown): void {
  const message = error instanceof Error ? error.message : 'the weekly script failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

async function readNpmLatest(rows: readonly LibraryFile[]): Promise<Record<string, string>> {
  const npmLatest: Record<string, string> = {};
  await eachSeries(rows, async row => {
    const tags = await npmDistTags(row.library.package);
    const latest = tags.latest;
    if (latest === undefined) throw new Error(`npm ${row.library.package} has no latest tag`);
    npmLatest[row.library.package] = latest;
  });
  return npmLatest;
}

async function readVueTags(): Promise<VueTags> {
  const tags = await npmDistTags('vue');
  if (tags.latest === undefined) throw new Error('npm vue has no latest tag');
  return { latest: tags.latest, rc: tags.rc ?? '(none)' };
}

function selectedProbes(
  rows: readonly LibraryFile[],
  npmLatest: Record<string, string>,
): SelectedProbe[] {
  const selected: SelectedProbe[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const latest = npmLatest[row.library.package];
    if (latest === undefined || !isNewerVersion(latest, row.library.verified.version)) continue;
    for (const probe of testedProbePaths(row.library)) {
      if (seen.has(probe)) continue;
      seen.add(probe);
      selected.push({ probe, packageName: row.library.package, version: latest });
    }
  }
  return selected;
}

function copyProbe(source: string, dest: string): void {
  cpSync(source, dest, {
    recursive: true,
    filter: from => {
      const base = path.basename(from);
      return base !== 'node_modules' && base !== 'dist' && base !== 'pnpm-lock.yaml';
    },
  });
}

function pinVersions(packagePath: string, versions: Record<string, string>): string[] {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson;
  const missing: string[] = [];
  for (const [name, version] of Object.entries(versions)) {
    if (pkg.dependencies !== undefined && Object.hasOwn(pkg.dependencies, name)) {
      pkg.dependencies[name] = version;
    } else if (pkg.devDependencies !== undefined && Object.hasOwn(pkg.devDependencies, name)) {
      pkg.devDependencies[name] = version;
    } else missing.push(name);
  }
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  return missing;
}

async function installProbe(dest: string, versions: Record<string, string>): Promise<void> {
  const missing = pinVersions(path.join(dest, 'package.json'), versions);
  if (missing.length > 0) throw new Error(`the probe does not depend on ${missing.join(', ')}`);
  await run('vp', ['install'], dest);
  await run('vp', ['run', 'build'], dest);
}

function versionsFor(item: SelectedProbe, vueInstalled: string | null): Record<string, string> {
  const versions: Record<string, string> = { [item.packageName]: item.version };
  if (vueInstalled !== null) versions.vue = vueInstalled;
  return versions;
}

async function observeSelected(
  repoRoot: string,
  selected: readonly SelectedProbe[],
  vueInstalled: string | null,
): Promise<Record<string, ProbeRun>> {
  const probes: Record<string, ProbeRun> = {};
  if (selected.length === 0) return probes;
  const browser = await launchChrome();
  try {
    await eachSeries(selected, async item => {
      const source = path.join(repoRoot, item.probe);
      const dest = mkdtempSync(path.join(tmpdir(), 'vaporfit-probe-'));
      try {
        copyProbe(source, dest);
        await installProbe(dest, versionsFor(item, vueInstalled));
        probes[item.probe] = await observeProbe(
          browser,
          path.join(dest, 'dist'),
          path.join(source, 'probe.mjs'),
        );
        writeLine(`${item.probe}: ${probes[item.probe]?.observed ?? 'error'}`);
      } catch (error) {
        probes[item.probe] = { expected: 'breaks', observed: 'error' };
        const message = error instanceof Error ? error.message : 'the probe failed';
        writeLine(`${item.probe}: the probe did not finish\n${message}`);
      } finally {
        rmSync(dest, { recursive: true, force: true });
      }
    });
  } finally {
    await browser.close();
  }
  return probes;
}

function issueUrls(rows: readonly LibraryFile[]): string[] {
  const urls: string[] = [];
  for (const row of rows) {
    const groups = [
      row.library.interop.evidence,
      ...row.library.features.map(feature => feature.evidence),
    ];
    for (const group of groups) {
      for (const evidence of group) {
        if (evidence.level === 'issue' && !urls.includes(evidence.url)) urls.push(evidence.url);
      }
    }
  }
  return urls;
}

async function issueState(url: string): Promise<string | null> {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/u.exec(url);
  const owner = match?.[1];
  const repo = match?.[2];
  const number = match?.[3];
  if (owner === undefined || repo === undefined || number === undefined) return null;
  const state = await new Promise<string | null>(resolve => {
    const child = spawn(
      'gh',
      ['api', `repos/${owner}/${repo}/issues/${number}`, '--jq', '.state'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let text = '';
    child.stdout.on('data', chunk => {
      text += String(chunk);
    });
    child.on('error', () => {
      resolve(null);
    });
    child.on('close', code => {
      resolve(code === 0 && text.trim().length > 0 ? text.trim() : null);
    });
  });
  return state;
}

async function readIssueStates(rows: readonly LibraryFile[]): Promise<Record<string, string>> {
  const issueStates: Record<string, string> = {};
  await eachSeries(issueUrls(rows), async url => {
    const state = await issueState(url);
    if (state !== null) issueStates[url] = state;
  });
  return issueStates;
}

function writeChanged(dataDirectory: string, plan: WeeklyPlan): void {
  for (const file of plan.changedFiles) {
    const entry = plan.libraries.find(item => item.file === file);
    if (entry === undefined) continue;
    writeFileSync(path.join(dataDirectory, file), `${JSON.stringify(entry.data, null, 2)}\n`);
  }
}

function setOutput(name: string, value: string): void {
  const file = process.env.GITHUB_OUTPUT;
  if (file === undefined || file.length === 0) return;
  appendFileSync(file, `${name}=${value}\n`);
}

function issueBody(items: readonly string[]): string {
  if (items.length === 0) return 'The list is empty.\n';
  return `${items.map(item => `- ${item}`).join('\n')}\n`;
}

function writeBodies(plan: WeeklyPlan): void {
  const outDir = process.env.WEEKLY_OUT ?? mkdtempSync(path.join(tmpdir(), 'vaporfit-weekly-'));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'pr-body.md'), `${plan.description}\n`);
  writeFileSync(path.join(outDir, 'issue-body.md'), issueBody(plan.personItems));
  setOutput('changed', plan.changedFiles.length > 0 ? 'true' : 'false');
  setOutput('close_issue', plan.closeIssue ? 'true' : 'false');
  setOutput('out', outDir);
  writeLine(plan.description);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runWeekly(): Promise<void> {
  try {
    const repoRoot = path.resolve(import.meta.dirname, '../..');
    const rows = readLibraries(path.join(repoRoot, 'data'));
    const npmLatest = await readNpmLatest(rows);
    const vueTags = await readVueTags();
    const vueInstalled = vueVersionForProbe(vueTags);
    const probes = await observeSelected(repoRoot, selectedProbes(rows, npmLatest), vueInstalled);
    const issueStates = await readIssueStates(rows);
    const plan = planWeeklyUpdate({
      libraries: rows.map(row => ({ file: row.file, data: row.library })),
      npmLatest,
      vueTags,
      probes,
      issueStates,
      date: today(),
    });
    writeChanged(path.join(repoRoot, 'data'), plan);
    writeBodies(plan);
  } catch (error) {
    fail(error);
  }
}
