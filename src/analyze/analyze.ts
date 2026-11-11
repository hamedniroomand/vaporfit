import { linkFiles } from '#link/link.ts';
import { vueFiles } from '#project/files.ts';
import type { Project } from '#project/project.ts';
import { openProject } from '#project/project.ts';
import type { AnalyzeOptions, ComponentReport, Report } from '#report/types.ts';
import { analyzeFile } from '#rules/file.ts';

import { buildReport } from './report.ts';

/** Analyzes every Vue file in a project and returns a plain JSON report. */
export function analyze(root: string, options?: AnalyzeOptions): Report {
  const project = openProject(root, options?.data);
  return buildReport(project, analyzeAll(project));
}

export function analyzeAll(project: Project): ComponentReport[] {
  const files = vueFiles(project.root).map(file => analyzeFile(project, file));
  return linkFiles(project, files).toSorted(byId);
}

export function byId(left: ComponentReport, right: ComponentReport): number {
  return left.id.localeCompare(right.id);
}
