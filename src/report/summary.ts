import type { ComponentReport, Level, PluginState, Report, Verdict } from './types.ts';

export function verdictOf(findings: { level: Level }[]): Verdict {
  if (findings.some(finding => finding.level === 'error')) return 'blocked';
  if (findings.some(finding => finding.level === 'unknown')) return 'unknown';
  return 'ready';
}

/** The level of the plugin finding. A missing plugin is an error only when a component has vapor. */
export function pluginLevel(state: PluginState, components: ComponentReport[]): Level | null {
  if (state === 'installed') return null;
  if (state === 'undetermined') return 'unknown';
  return components.some(component => component.vapor) ? 'error' : 'note';
}

export function summarize(components: ComponentReport[]): Report['summary'] {
  const interop = { blocked: 0, ready: 0, unknown: 0 };
  const pure = { blocked: 0, ready: 0, unknown: 0 };
  for (const component of components) {
    interop[component.interop] += 1;
    pure[component.pure] += 1;
  }
  return { components: components.length, interop, pure };
}

export function findingGroups(components: ComponentReport[]): Report['groups'] {
  const counts = new Map<string, Set<string>>();
  for (const component of components) {
    for (const finding of component.findings) {
      // A note does not hold back a component.
      if (finding.level === 'note') continue;
      const ids = counts.get(finding.rule) ?? new Set<string>();
      ids.add(component.id);
      counts.set(finding.rule, ids);
    }
  }
  return [...counts.entries()]
    .map(([rule, ids]) => ({ components: ids.size, rule }))
    .toSorted(
      (left, right) => right.components - left.components || left.rule.localeCompare(right.rule),
    );
}
