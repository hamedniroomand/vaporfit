import { findingId } from '#report/finding-id.ts';
import type { Finding, Report } from '#report/types.ts';
import { RULE } from '#rules/messages.ts';

export const READY_SENTENCE =
  '"ready" means that vaporfit found no known problem. It does not test behavior.';

export const PLUGIN_MISSING = 'The app entry does not have vaporInteropPlugin.';

export const PLUGIN_THROWS = 'A component that has vapor throws at mount.';

export const PLUGIN_UNKNOWN = 'The tool cannot tell if the app has vaporInteropPlugin.';

/** The text report. Each sentence is a constant in this file or a finding message. */
export function formatText(report: Report): string {
  const lines: string[] = [];
  const plugin = pluginLines(report);
  if (plugin.length > 0) lines.push(...plugin, '');
  lines.push(...header(report), '');
  const blocks = findingBlocks(report);
  if (blocks.length > 0) lines.push(blocks.join('\n\n'), '');
  lines.push(
    'Holds back the most components',
    ...rankLines(report),
    '',
    'Keeps the VDOM runtime',
    ...keepsLines(report),
    '',
    'Order',
    ...report.order,
    '',
    'Ready',
  );
  for (const component of report.components) {
    if (component.interop === 'ready') lines.push(component.file);
  }
  lines.push(...coverageLines(report), '', READY_SENTENCE);
  return `${lines.join('\n')}\n`;
}

function header(report: Report): string[] {
  return [
    `vaporfit ${report.tool.version}`,
    `vue ${report.project.vue ?? 'none'}`,
    ...compilerLine(report),
    `data ${report.tool.data}`,
    `components ${report.summary.components}`,
    countLine('interop', report.summary.interop),
    countLine('pure', report.summary.pure),
    `plugin ${report.project.interopPlugin.state}`,
    ...coverageLines(report),
  ];
}

function compilerLine(report: Report): string[] {
  const { source, version } = report.project.compiler;
  return source === 'tool' ? [`compiler ${version} from vaporfit`] : [];
}

function coverageLines(report: Report): string[] {
  const { stale, withData, withoutData } = report.project.coverage;
  return [
    `Vue libraries with data: ${withData.length}`,
    ...withData.map(name => (stale.includes(name) ? `${name} stale` : name)),
    `Vue libraries with no data: ${withoutData.length}`,
    ...withoutData,
  ];
}

function pluginLines(report: Report): string[] {
  const plugin = report.project.interopPlugin;
  if (plugin.state === 'installed' || plugin.level === null) return [];
  const location = plugin.location ?? { column: 0, file: '', line: 0 };
  const lines = [
    `${plugin.level} ${findingId({ location, rule: 'vapor/missing-interop-plugin' })}`,
  ];
  if (plugin.state === 'undetermined') lines.push(PLUGIN_UNKNOWN);
  else {
    lines.push(PLUGIN_MISSING);
    if (plugin.level === 'error') lines.push(PLUGIN_THROWS);
  }
  if (plugin.location !== null) {
    lines.push(`${plugin.location.file}:${plugin.location.line}:${plugin.location.column}`);
  }
  return lines;
}

function countLine(
  label: string,
  counts: { ready: number; blocked: number; unknown: number },
): string {
  return `${label} ${counts.ready} ready ${counts.blocked} blocked ${counts.unknown} unknown`;
}

function rankLines(report: Report): string[] {
  return report.groups.map(group => `${group.rule} ${group.components}`);
}

function keepsLines(report: Report): string[] {
  const causes: CauseTable = { libraries: new Map(), rules: new Map() };
  const { libraries, rules } = causes;
  for (const component of report.components) {
    if (component.pure === 'ready') continue;
    // A component counts one time for each library and for each rule.
    const seen = new Set<string>();
    for (const finding of component.findings) addCause(causes, seen, component.id, finding);
  }
  const rows = [
    ...[...libraries].map(([name, row]) => ({
      count: row.ids.size,
      label: `${name} ${row.ids.size} ${row.declared}`,
    })),
    ...[...rules].map(([rule, ids]) => ({ count: ids.size, label: `${rule} ${ids.size}` })),
  ];
  return rows
    .toSorted((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .map(row => row.label);
}

interface CauseTable {
  libraries: Map<string, { declared: string; ids: Set<string> }>;
  rules: Map<string, Set<string>>;
}

function addCause(causes: CauseTable, seen: Set<string>, id: string, finding: Finding): void {
  const { libraries, rules } = causes;
  if (finding.level === 'note') return;
  if (finding.rule === RULE.vdom && finding.package !== undefined) {
    const key = `package ${finding.package.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const row = libraries.get(finding.package.name) ?? {
      declared: declarationText(finding),
      ids: new Set<string>(),
    };
    row.ids.add(id);
    libraries.set(finding.package.name, row);
    return;
  }
  if (
    finding.rule !== RULE.vdom &&
    finding.rule !== RULE.asyncSetup &&
    finding.rule !== RULE.nuxt
  ) {
    return;
  }
  const key = `rule ${finding.rule}`;
  if (seen.has(key)) return;
  seen.add(key);
  const ids = rules.get(finding.rule) ?? new Set<string>();
  ids.add(id);
  rules.set(finding.rule, ids);
}

function declarationText(finding: Finding): string {
  if (
    finding.declared === undefined ||
    finding.declared === null ||
    finding.declared.length === 0
  ) {
    return 'no declaration';
  }
  return finding.declared;
}

function findingBlocks(report: Report): string[] {
  const findings = report.components.flatMap(component => component.findings).toSorted(byFailure);
  return findings.map(finding => {
    const lines = [
      `${finding.level} ${finding.failure} ${findingId(finding)}`,
      finding.message,
      `${finding.location.file}:${finding.location.line}:${finding.location.column}`,
      finding.rule,
    ];
    if (finding.chain !== undefined && finding.chain.length > 0) {
      lines.push(`chain ${finding.chain.join(' > ')}`);
    }
    if (finding.package !== undefined) {
      lines.push(`package ${finding.package.name} ${finding.package.version ?? 'none'}`);
    }
    return lines.join('\n');
  });
}

function failureRank(failure: Report['components'][number]['findings'][number]['failure']): number {
  if (failure === 'silent') return 0;
  if (failure === 'runtime-error') return 1;
  if (failure === 'compile') return 2;
  return 3;
}

function byFailure(
  left: Report['components'][number]['findings'][number],
  right: Report['components'][number]['findings'][number],
): number {
  const rank = failureRank(left.failure) - failureRank(right.failure);
  if (rank !== 0) return rank;
  const file = left.location.file.localeCompare(right.location.file);
  if (file !== 0) return file;
  return (
    left.location.line - right.location.line ||
    left.location.column - right.location.column ||
    left.rule.localeCompare(right.rule)
  );
}
