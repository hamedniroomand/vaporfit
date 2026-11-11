import type { ComponentReport, Report, Verdict } from './types.ts';

/** Returns the components of a report, optionally limited to one verdict. */
export function listComponents(report: Report, filter?: { verdict?: Verdict }): ComponentReport[] {
  if (!filter?.verdict) return report.components;
  return report.components.filter(component => component.interop === filter.verdict);
}

/** Returns one component by its id, which is the path relative to the project root. */
export function getComponent(report: Report, id: string): ComponentReport | undefined {
  return report.components.find(component => component.id === id);
}
