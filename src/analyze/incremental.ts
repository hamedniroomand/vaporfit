import path from 'node:path';

import { linkFiles } from '#link/link.ts';
import { relativeId, resolveLocal, SKIPPED_DIRECTORIES, vueFiles } from '#project/files.ts';
import type { ComponentEdges } from '#project/graph.ts';
import { affectedIds, componentEdges } from '#project/graph.ts';
import type { Project } from '#project/project.ts';
import { openProject } from '#project/project.ts';
import type { ComponentReport, Report } from '#report/types.ts';
import type { FileAnalysis } from '#rules/file.ts';
import { analyzeFile } from '#rules/file.ts';

import { analyzeAll, byId } from './analyze.ts';
import { buildReport } from './report.ts';

/** The most times that an incremental run adds the dependencies of new files. */
const MAX_CLOSURE_ROUNDS = 8;

interface FileIndex {
  project: Project;
  pathOf: Map<string, string>;
  edges: ComponentEdges;
}

/**
 * Analyzes the changed Vue files and the files that depend on them.
 * The report matches `analyze` for the same project.
 */
export function analyzeFiles(
  root: string,
  changedPaths: readonly string[],
  previous: Report,
): Report {
  const project = openProject(root);
  const sameRoot = path.resolve(previous.project.root) === project.root;
  if (!sameRoot || changedPaths.some(changed => !isProjectVue(project.root, changed))) {
    return buildReport(project, analyzeAll(project));
  }
  const files = vueFiles(project.root);
  const index: FileIndex = {
    edges: componentEdges(project, files),
    pathOf: new Map(files.map(file => [relativeId(project.root, file), file])),
    project,
  };
  const affected = affectedIds(previous, changedIds(index, changedPaths, previous), index.edges);
  const present = [...affected].filter(id => index.pathOf.has(id));
  if (present.length === files.length) return buildReport(project, analyzeAll(project));
  const fresh = new Map(analyzeClosure(index, present).map(component => [component.id, component]));
  const kept = previous.components.filter(
    component => index.pathOf.has(component.id) && !fresh.has(component.id),
  );
  return buildReport(project, [...kept, ...fresh.values()].toSorted(byId));
}

function changedIds(
  index: FileIndex,
  changedPaths: readonly string[],
  previous: Report,
): Set<string> {
  const changed = new Set(changedPaths.map(changed => idOf(index.project.root, changed)));
  const known = new Set(previous.components.map(component => component.id));
  for (const id of index.pathOf.keys()) if (!known.has(id)) changed.add(id);
  for (const id of known) if (!index.pathOf.has(id)) changed.add(id);
  return changed;
}

/**
 * Analyzes the given components together with each file that they need for the link step.
 * A new dependency can need a dependency of its own, so the set grows in rounds.
 */
function analyzeClosure(index: FileIndex, ids: string[]): ComponentReport[] {
  const closure = new Set(ids);
  let analyses = analyzeSet(index, closure);
  for (let round = 0; round < MAX_CLOSURE_ROUNDS; round += 1) {
    const extra = missingDependencies(index, analyses, closure);
    if (extra.length === 0) break;
    for (const id of extra) closure.add(id);
    analyses = analyzeSet(index, closure);
  }
  return linkFiles(index.project, analyses);
}

function analyzeSet(index: FileIndex, ids: Set<string>): FileAnalysis[] {
  return [...ids]
    .toSorted((left, right) => left.localeCompare(right))
    .flatMap(id => {
      const file = index.pathOf.get(id);
      return file === undefined ? [] : [analyzeFile(index.project, file)];
    });
}

function missingDependencies(
  index: FileIndex,
  analyses: FileAnalysis[],
  closure: Set<string>,
): string[] {
  const extra: string[] = [];
  const add = (id: string): void => {
    if (!index.pathOf.has(id) || closure.has(id) || extra.includes(id)) return;
    extra.push(id);
  };
  for (const file of analyses) {
    for (const source of localSources(file)) {
      const resolved = resolveLocal(path.dirname(file.absolute), source);
      if (resolved !== null) add(relativeId(index.project.root, resolved));
    }
  }
  for (const id of extra.slice()) {
    for (const [importer, targets] of index.edges) {
      if (targets.has(id)) add(importer);
    }
  }
  return extra;
}

function localSources(file: FileAnalysis): string[] {
  const sources = file.facts.imports.map(item => item.source);
  for (const component of file.template.components) {
    const { kind, source } = component.resolved;
    if (kind === 'local-file' && source !== undefined) sources.push(source);
  }
  return sources;
}

function isProjectVue(root: string, changed: string): boolean {
  const id = idOf(root, changed);
  if (!id.endsWith('.vue')) return false;
  return !id.split('/').some(part => SKIPPED_DIRECTORIES.has(part));
}

function idOf(root: string, changed: string): string {
  const absolute = path.isAbsolute(changed) ? changed : path.resolve(root, changed);
  return relativeId(root, absolute);
}
