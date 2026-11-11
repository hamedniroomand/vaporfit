import type { Library } from '#data/types.ts';
import { compareVersions, isNewerVersion, parseVersion } from '#semver.ts';

import { testedProbePaths } from './probes.ts';

export interface VueTags {
  latest: string;
  rc: string;
}

export interface ProbeRun {
  expected: 'breaks' | 'works';
  observed: 'breaks' | 'works' | 'error';
}

export interface WeeklyLibrary {
  file: string;
  data: Library;
}

export interface WeeklyInput {
  libraries: WeeklyLibrary[];
  npmLatest: Record<string, string>;
  vueTags: VueTags;
  probes: Record<string, ProbeRun>;
  issueStates: Record<string, string>;
  date: string;
}

export interface WeeklyPlan {
  libraries: WeeklyLibrary[];
  changedFiles: string[];
  description: string;
  personItems: string[];
  closeIssue: boolean;
  vueInstalled: string | null;
}

interface RowUpdate {
  entry: WeeklyLibrary;
  changed: boolean;
  probeLines: string[];
  closedLines: string[];
  extraLines: string[];
  updatedLine: string | null;
}

/** Vue version to install in a probe. Null means do not install Vue and do not write verified.vue. */
export function vueVersionForProbe(tags: VueTags): string | null {
  const candidates = [tags.rc, tags.latest].filter(version => isProbeVue(version));
  let selected: string | null = null;
  for (const candidate of candidates) {
    if (selected === null || compareVersions(candidate, selected) === 1) selected = candidate;
  }
  return selected;
}

const probeVueFloor = '3.6.0-rc.14';

function isProbeVue(version: string): boolean {
  const parsed = parseVersion(version);
  if (parsed === null) return false;
  const [major, minor] = parsed.core;
  if (major !== 3 || minor !== 6) return false;
  const order = compareVersions(version, probeVueFloor);
  return order !== null && order >= 0;
}

function hasWorksStatus(library: Library): boolean {
  return (
    library.interop.status === 'works' ||
    library.features.some(feature => feature.status === 'works')
  );
}

function closedIssueLines(library: Library, issueStates: Record<string, string>): string[] {
  const lines: string[] = [];
  const groups = [library.interop.evidence, ...library.features.map(feature => feature.evidence)];
  for (const group of groups) {
    for (const evidence of group) {
      if (evidence.level !== 'issue') continue;
      const state = issueStates[evidence.url];
      if (state?.toLowerCase() !== 'closed' || evidence.state.toLowerCase() === 'closed') continue;
      const line = `${evidence.url} (data says ${evidence.state})`;
      if (!lines.includes(line)) lines.push(line);
    }
  }
  return lines;
}

function probeLine(probe: string, run: ProbeRun | undefined): string | null {
  if (run === undefined) return `${probe}: the probe did not run`;
  if (run.observed === 'error') return `${probe}: the probe did not finish`;
  if (run.observed !== run.expected)
    return `${probe}: expected ${run.expected}, observed ${run.observed}`;
  return null;
}

function probeLinesFor(library: Library, probes: Record<string, ProbeRun>): string[] {
  const lines: string[] = [];
  for (const probe of testedProbePaths(library)) {
    const line = probeLine(probe, probes[probe]);
    if (line !== null) lines.push(line);
  }
  return lines;
}

function probesFinished(library: Library, probes: Record<string, ProbeRun>): boolean {
  const paths = testedProbePaths(library);
  if (paths.length === 0) return false;
  return paths.every(probe => {
    const run = probes[probe];
    return run !== undefined && run.observed !== 'error';
  });
}

function section(title: string, lines: readonly string[]): string[] {
  if (lines.length === 0) return [];
  return [title, ...lines.map(line => `- ${line}`)];
}

function describe(options: {
  probeLines: readonly string[];
  closedLines: readonly string[];
  vueTags: VueTags;
  vueInstalled: string | null;
  updated: readonly string[];
  extraLines: readonly string[];
}): string {
  const installed = options.vueInstalled ?? 'none';
  const blocks = [
    section('Probe results that differ from expected', options.probeLines),
    section('Closed issues', options.closedLines),
    section('Vue tags', [
      `latest: ${options.vueTags.latest}`,
      `rc: ${options.vueTags.rc}`,
      `installed: ${installed}`,
    ]),
    section('Updated rows', options.updated),
    section('Needs a person', options.extraLines),
  ].filter(block => block.length > 0);
  return blocks.map(block => block.join('\n')).join('\n\n');
}

interface RowLines {
  closedLines: string[];
  probeLines?: string[];
  extraLines?: string[];
}

interface RowDraft {
  entry: WeeklyLibrary;
  data: Library;
}

function kept(draft: RowDraft, lines: RowLines): RowUpdate {
  return {
    entry: { file: draft.entry.file, data: draft.data },
    changed: false,
    probeLines: lines.probeLines ?? [],
    closedLines: lines.closedLines,
    extraLines: lines.extraLines ?? [],
    updatedLine: null,
  };
}

/** The row moves to the new version. Its status does not change. */
function applyVerified(
  draft: RowDraft,
  verified: { version: string; date: string; vue: string | null },
  lines: RowLines,
): RowUpdate {
  const { data, entry } = draft;
  const latest = verified.version;
  const previous = data.verified.version;
  data.verified.version = latest;
  data.verified.date = verified.date;
  if (verified.vue !== null) data.verified.vue = verified.vue;
  return {
    entry: { file: entry.file, data },
    changed: true,
    probeLines: lines.probeLines ?? [],
    closedLines: lines.closedLines,
    extraLines: [],
    updatedLine: `${data.package} ${previous} -> ${latest} (status not changed)`,
  };
}

function updateRow(
  entry: WeeklyLibrary,
  input: WeeklyInput,
  vueInstalled: string | null,
): RowUpdate {
  const data = globalThis.structuredClone(entry.data);
  const draft: RowDraft = { data, entry };
  const closedLines = closedIssueLines(data, input.issueStates);
  const latest = input.npmLatest[data.package];
  if (typeof latest !== 'string' || !isNewerVersion(latest, data.verified.version)) {
    return kept(draft, { closedLines });
  }
  if (testedProbePaths(data).length === 0) {
    const note = `${data.package} ${data.verified.version} -> ${latest} has no probe`;
    return kept(draft, { closedLines, extraLines: [note] });
  }
  const probeLines = probeLinesFor(data, input.probes);
  if (!probesFinished(data, input.probes)) return kept(draft, { closedLines, probeLines });
  // A probe result that changed needs a person. The row does not get the new version.
  if (probeLines.length > 0) return kept(draft, { closedLines, probeLines });
  // A works status stays on the old version. The new version does not inherit it.
  if (hasWorksStatus(data)) {
    const note = `${data.package} ${data.verified.version} -> ${latest} does not inherit works`;
    return kept(draft, { closedLines, extraLines: [note], probeLines });
  }
  const verified = { date: input.date, version: latest, vue: vueInstalled };
  return applyVerified(draft, verified, { closedLines, probeLines });
}

function unique(lines: readonly string[]): string[] {
  const result: string[] = [];
  for (const line of lines) {
    if (!result.includes(line)) result.push(line);
  }
  return result;
}

/** Plans the weekly data change. It does not install packages and it does not open a pull request. */
export function planWeeklyUpdate(input: WeeklyInput): WeeklyPlan {
  const vueInstalled = vueVersionForProbe(input.vueTags);
  const rows = input.libraries.map(entry => updateRow(entry, input, vueInstalled));
  const probeLines = unique(rows.flatMap(row => row.probeLines));
  const closedLines = unique(rows.flatMap(row => row.closedLines));
  const extraLines = unique(rows.flatMap(row => row.extraLines));
  const updated = rows.flatMap(row => (row.updatedLine === null ? [] : [row.updatedLine]));
  const personItems = unique([...probeLines, ...closedLines, ...extraLines]);
  return {
    libraries: rows.map(row => row.entry),
    changedFiles: rows.filter(row => row.changed).map(row => row.entry.file),
    description: describe({
      probeLines,
      closedLines,
      vueTags: input.vueTags,
      vueInstalled,
      updated,
      extraLines,
    }),
    personItems,
    closeIssue: personItems.length === 0,
    vueInstalled,
  };
}
