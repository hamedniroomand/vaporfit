import path from 'node:path';

import type { Report } from '#report/types.ts';

import { readText, relativeId, resolveLocal } from './files.ts';
import type { Project } from './project.ts';
import { readRegistries } from './registry.ts';

export type ComponentEdges = Map<string, Set<string>>;

interface RegistryTag {
  id: string;
  names: string[];
}

/** Files that can change when `changed` changes, including registry parents and old chains. */
export function affectedIds(
  previous: Report,
  changed: Set<string>,
  edges: ComponentEdges,
): Set<string> {
  return expand(seed(previous, changed), edges);
}

export function componentEdges(project: Project, files: string[]): ComponentEdges {
  const edges = importEdges(project.root, files);
  const tags = registryTags(project);
  if (tags.length === 0) return edges;
  for (const file of files) addTagEdges(relativeId(project.root, file), file, edges, tags);
  return edges;
}

function seed(previous: Report, changed: Set<string>): Set<string> {
  const ids = new Set(changed);
  for (const component of previous.components) {
    for (const finding of component.findings) {
      const chain = [component.id, ...(finding.chain ?? [])];
      if (!chain.some(id => changed.has(id))) continue;
      for (const id of chain) ids.add(id);
    }
  }
  return ids;
}

function expand(changed: Set<string>, edges: ComponentEdges): Set<string> {
  const closure = new Set<string>();
  const pending = [...changed];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || closure.has(id)) continue;
    closure.add(id);
    for (const target of edges.get(id) ?? []) pending.push(target);
    for (const [importer, targets] of edges) {
      if (targets.has(id)) pending.push(importer);
    }
  }
  return closure;
}

function importEdges(root: string, files: string[]): ComponentEdges {
  const edges: ComponentEdges = new Map();
  for (const file of files) {
    const targets = new Set<string>();
    for (const specifier of specifiers(readText(file) ?? '')) {
      const resolved = resolveLocal(path.dirname(file), specifier);
      if (resolved !== null) targets.add(relativeId(root, resolved));
    }
    edges.set(relativeId(root, file), targets);
  }
  return edges;
}

function specifiers(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/gu)) {
    const value = match[1];
    if (value !== undefined) found.push(value);
  }
  return found;
}

function registryTags(project: Project): RegistryTag[] {
  const registries = readRegistries(project);
  const tags: RegistryTag[] = [];
  for (const map of [registries.app, registries.nuxt, registries.unplugin]) {
    for (const [name, target] of map) {
      if (target.kind !== 'file') continue;
      tags.push({ id: relativeId(project.root, target.file), names: tagNames(name) });
    }
  }
  return tags;
}

function addTagEdges(id: string, file: string, edges: ComponentEdges, tags: RegistryTag[]): void {
  const source = readText(file) ?? '';
  const targets = edges.get(id) ?? new Set<string>();
  for (const tag of tags) {
    if (tag.id === id) continue;
    if (tag.names.some(name => mentionsTag(source, name))) targets.add(tag.id);
  }
  edges.set(id, targets);
}

function tagNames(name: string): string[] {
  const kebab = name.replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
  return [...new Set([name, kebab])];
}

function mentionsTag(source: string, name: string): boolean {
  const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`<${escaped}\\b`, 'u').test(source);
}
