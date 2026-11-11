import { createRequire } from 'node:module';
import path from 'node:path';

import type { Library } from '#data/types.ts';
import { isFile, readText, relativeId } from '#project/files.ts';
import { packageNameOf } from '#project/manifest.ts';
import { lookupTag } from '#project/registry.ts';
import type { TagTarget } from '#project/targets.ts';
import type { SourceLocation } from '#report/types.ts';
import type { FileAnalysis } from '#rules/file.ts';

import type { LinkContext } from './context.ts';

const MARKER = /\bdefineVaporComponent\b/u;

type TemplateUse = FileAnalysis['template']['components'][number];

export interface PureSession {
  link: LinkContext;
  texts: Map<string, string | null>;
  /** Resolves a specifier from the project root. Null when the project has no resolver. */
  resolveFile: ((specifier: string) => string) | null;
}

interface LibraryHit {
  kind: 'library';
  tail: string;
  packageName: string;
  version: string | null;
  verified: string;
  declared: string | null;
}

interface NamedHit {
  kind: 'jsx' | 'render';
  tail: string;
}

interface VueHit {
  kind: 'vue';
  file: FileAnalysis;
}

export type ChildHit = { location: SourceLocation } & (
  | LibraryHit
  | NamedHit
  | VueHit
  | { kind: 'vapor' }
  | { kind: 'unknown' }
  | { kind: 'skip' }
);

function resolver(root: string): ((specifier: string) => string) | null {
  try {
    return createRequire(path.join(root, 'package.json')).resolve;
  } catch {
    return null;
  }
}

export function openPureSession(link: LinkContext): PureSession {
  return { link, resolveFile: resolver(link.project.root), texts: new Map() };
}

/** Classifies one template tag. A missing file is unknown. A file with the marker is Vapor. */
export function classifyComponent(
  session: PureSession,
  file: FileAnalysis,
  component: TemplateUse,
): ChildHit {
  const location = tagLocation(file, component);
  if (component.dynamic) return { kind: 'unknown', location };
  const resolved = component.resolved;
  if (resolved.kind === 'element') return { kind: 'skip', location };
  if (resolved.kind === 'vapor') return { kind: 'vapor', location };
  if (resolved.kind === 'function' || resolved.kind === 'object') {
    return { kind: 'render', location, tail: component.tag };
  }
  if (resolved.kind === 'import' && resolved.source !== undefined) {
    return libraryHit(session, resolved.source, location);
  }
  if (resolved.kind === 'local-file' && resolved.source !== undefined) {
    return localHit(session, file, resolved.source, location);
  }
  if (resolved.kind === 'missing') return registryHit(session, file, component, location);
  return { kind: 'unknown', location };
}

function registryHit(
  session: PureSession,
  file: FileAnalysis,
  component: TemplateUse,
  location: SourceLocation,
): ChildHit {
  const { project, registries } = session.link;
  const target = lookupTag(component.tag, registries, project.compiler);
  if (target === null) return { kind: 'unknown', location };
  return targetHit(session, file, target, location);
}

function targetHit(
  session: PureSession,
  file: FileAnalysis,
  target: TagTarget,
  location: SourceLocation,
): ChildHit {
  if (target.kind === 'package') return libraryHit(session, target.source, location);
  return fileHit(session, file, target.file, location);
}

function localHit(
  session: PureSession,
  file: FileAnalysis,
  source: string,
  location: SourceLocation,
): ChildHit {
  const absolute = resolveLocalFile(file.absolute, source);
  if (absolute === null) return { kind: 'unknown', location };
  return fileHit(session, file, absolute, location);
}

function fileHit(
  session: PureSession,
  file: FileAnalysis,
  absolute: string,
  location: SourceLocation,
): ChildHit {
  const child = session.link.files.get(absolute);
  if (child !== undefined) return { file: child, kind: 'vue', location };
  const text = readText(absolute);
  if (text === null) return { kind: 'unknown', location };
  if (MARKER.test(text)) return { kind: 'vapor', location };
  return { kind: 'jsx', location, tail: relativeId(session.link.project.root, absolute) };
}

function libraryHit(session: PureSession, specifier: string, location: SourceLocation): ChildHit {
  const text = libraryText(session, specifier);
  if (text === null) return { kind: 'unknown', location };
  if (MARKER.test(text)) return { kind: 'vapor', location };
  const { project } = session.link;
  const packageName = packageNameOf(specifier);
  const library = project.data.libraries.find(item => item.package === packageName);
  return {
    declared: declaredVersion(library),
    kind: 'library',
    location,
    packageName,
    tail: packageName,
    verified: library?.verified.version ?? '',
    version: project.versionOf(packageName),
  };
}

function libraryText(session: PureSession, specifier: string): string | null {
  const cached = session.texts.get(specifier);
  if (cached !== undefined) return cached;
  const text = readLibrary(session, specifier);
  session.texts.set(specifier, text);
  return text;
}

function readLibrary(session: PureSession, specifier: string): string | null {
  try {
    const file = session.resolveFile?.(specifier);
    return file === undefined ? null : readText(file);
  } catch {
    return null;
  }
}

function declaredVersion(library: Library | undefined): string | null {
  const since = library?.declared?.since;
  return since === undefined || since === null || since.length === 0 ? null : since;
}

function tagLocation(file: FileAnalysis, component: TemplateUse): SourceLocation {
  const location = component.location;
  const line = file.source.split('\n')[location.line - 1] ?? '';
  if (line[location.column - 1] !== '<') return location;
  return { ...location, column: location.column + 1 };
}

/** The file of a relative import. A file that is not a Vue file counts, for example a TSX file. */
function resolveLocalFile(file: string, source: string): string | null {
  if (!source.startsWith('.')) return null;
  const absolute = path.resolve(path.dirname(file), source);
  if (isFile(absolute)) return absolute;
  const withVue = absolute.endsWith('.vue') ? absolute : `${absolute}.vue`;
  return isFile(withVue) ? withVue : null;
}
