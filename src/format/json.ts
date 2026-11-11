import { findingId } from '#report/finding-id.ts';
import type { Finding, Report } from '#report/types.ts';

export function formatJson(report: Report): string {
  return `${JSON.stringify(withIds(report), null, 2)}\n`;
}

function withIds(report: Report): Report {
  return {
    ...report,
    components: report.components.map(component => ({
      ...component,
      findings: component.findings.map(finding => withId(finding)),
    })),
  };
}

function withId(finding: Finding): Finding & { id: string } {
  return { id: findingId(finding), ...finding };
}
