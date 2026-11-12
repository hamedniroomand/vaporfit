import type { Project } from '#project/project.ts';
import { readRegistries } from '#project/registry.ts';
import { verdictOf } from '#report/summary.ts';
import type { ComponentReport, Finding } from '#report/types.ts';
import type { FileAnalysis } from '#rules/file.ts';
import type { PlacedFinding } from '#rules/findings.ts';
import { uniqueFindings } from '#rules/findings.ts';

import type { LinkContext } from './context.ts';
import { applyPure } from './pure.ts';
import { refFindings } from './refs.ts';
import { tagFindings } from './uses.ts';

const LINK_RULES: readonly ((link: LinkContext, file: FileAnalysis) => PlacedFinding[])[] = [
  tagFindings,
  refFindings,
];

/**
 * Joins the analyzed files: adds the findings that need more than one file, sets the interop
 * verdict again, then sets the pure verdict. Returns the report of each file, in the same order.
 */
export function linkFiles(project: Project, files: FileAnalysis[]): ComponentReport[] {
  const link: LinkContext = {
    files: new Map(files.map(file => [file.absolute, file])),
    project,
    registries: readRegistries(project),
  };
  const extras = new Map<string, Finding[]>();
  for (const file of files) {
    for (const rule of LINK_RULES) {
      for (const { finding, id } of rule(link, file)) {
        const list = extras.get(id) ?? [];
        list.push(finding);
        extras.set(id, list);
      }
    }
  }
  for (const { report } of files) {
    report.findings = uniqueFindings([...report.findings, ...(extras.get(report.id) ?? [])]);
    report.interop = verdictOf(report.findings);
  }
  applyPure(link);
  return files.map(file => file.report);
}
