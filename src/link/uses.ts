import path from 'node:path';

import { resolveLocal } from '#project/files.ts';
import type { SourceLocation } from '#report/types.ts';
import { propHits, propNames } from '#rules/features.ts';
import type { FileAnalysis } from '#rules/file.ts';
import type { PlacedFinding } from '#rules/findings.ts';
import { featureFinding } from '#rules/findings.ts';
import { filled } from '#syntax/filled.ts';
import type { TemplateComponent } from '#syntax/template.ts';

import type { LinkContext } from './context.ts';
import { targetOfUse } from './context.ts';
import type { ForwardHit } from './forward.ts';
import { forwardedProps, readForwardScript, spreadKind } from './forward.ts';

interface ForwardPath {
  certainty: 'sure' | 'unsure';
  files: string[];
  imported: string;
  source: string;
}

interface SiteProp {
  name: string;
  location: SourceLocation;
  /** True when the prop can be in a spread that the tool cannot read. The level is unknown. */
  hidden?: boolean;
}

/**
 * Findings for tags that the script does not import directly: a tag from a registry, and a local
 * wrapper that passes a prop to a library component. Also removes each tag that a registry
 * resolves from `unresolved`.
 */
export function tagFindings(link: LinkContext, file: FileAnalysis): PlacedFinding[] {
  const placed: PlacedFinding[] = [];
  const unresolved = new Set(file.report.unresolved);
  const names = propNames(link.project.data);
  for (const component of file.template.components) {
    const target = targetOfUse(link, file, component);
    const registered = component.resolved.kind === 'missing';
    if (registered && target !== null) unresolved.delete(component.tag);
    const hidden = hiddenProps(file, component, names);
    if (target?.kind === 'package') {
      // The rules of the file already have the named props of an imported component.
      const props = registered ? [...component.props, ...hidden] : hidden;
      placed.push(...packagePropFindings(link, file, props, target));
    }
    if (target?.kind === 'file') {
      const props = [...component.props, ...hidden];
      placed.push(...wrapperPropFindings(link, file, props, target.file));
    }
  }
  file.report.unresolved = [...unresolved].toSorted();
  return placed;
}

/**
 * A spread of the props or attrs of the file is judged where the file is used. Each other spread
 * can hold each prop that the data knows.
 */
function hiddenProps(
  file: FileAnalysis,
  component: TemplateComponent,
  names: string[],
): SiteProp[] {
  if (component.spreads.length === 0) return [];
  const script = readForwardScript(file.source);
  return component.spreads
    .filter(spread => spreadKind(spread.expression.trim(), script) === 'other')
    .flatMap(spread => names.map(name => ({ hidden: true, location: spread.location, name })));
}

function packagePropFindings(
  link: LinkContext,
  file: FileAnalysis,
  props: SiteProp[],
  target: { imported: string; source: string },
): PlacedFinding[] {
  const id = file.report.id;
  const placed: PlacedFinding[] = [];
  for (const prop of props) {
    const use = { component: target.imported, prop: prop.name, source: target.source };
    for (const hit of propHits(link.project, use)) {
      const finding = featureFinding(link.project, hit, {
        chain: [id, hit.library.package],
        level: prop.hidden === true ? 'unknown' : undefined,
        location: prop.location,
      });
      place(placed, id, finding);
    }
  }
  return placed;
}

function wrapperPropFindings(
  link: LinkContext,
  file: FileAnalysis,
  props: SiteProp[],
  wrapper: string,
): PlacedFinding[] {
  const id = file.report.id;
  const placed: PlacedFinding[] = [];
  for (const prop of props) {
    for (const forwarded of forwardPaths(link, wrapper, prop.name, new Set())) {
      const use = { component: forwarded.imported, prop: prop.name, source: forwarded.source };
      for (const hit of propHits(link.project, use)) {
        const finding = featureFinding(link.project, hit, {
          chain: [id, ...forwarded.files, hit.library.package],
          level: prop.hidden === true || forwarded.certainty === 'unsure' ? 'unknown' : undefined,
          location: prop.location,
        });
        place(placed, id, finding);
      }
    }
  }
  return placed;
}

function forwardPaths(
  link: LinkContext,
  absolute: string,
  prop: string,
  seen: Set<string>,
): ForwardPath[] {
  if (seen.has(absolute)) return [];
  const file = link.files.get(absolute);
  if (file === undefined) return [];
  const next = new Set([...seen, absolute]);
  const paths: ForwardPath[] = [];
  for (const hit of forwardedProps(prop, file, link.project.compiler)) {
    paths.push(...directPaths(file, hit));
    const child = localChild(file, hit);
    if (child === null) continue;
    for (const inner of forwardPaths(link, child, prop, next)) {
      paths.push({
        certainty: hit.certainty === 'unsure' || inner.certainty === 'unsure' ? 'unsure' : 'sure',
        files: [file.report.id, ...inner.files],
        imported: inner.imported,
        source: inner.source,
      });
    }
  }
  return paths;
}

function directPaths(file: FileAnalysis, hit: ForwardHit): ForwardPath[] {
  if (hit.resolved.kind !== 'import' || !filled(hit.resolved.source)) return [];
  return [
    {
      certainty: hit.certainty,
      files: [file.report.id],
      imported: hit.imported,
      source: hit.resolved.source,
    },
  ];
}

function localChild(file: FileAnalysis, hit: ForwardHit): string | null {
  if (hit.resolved.kind !== 'local-file' || !filled(hit.resolved.source)) return null;
  return resolveLocal(path.dirname(file.absolute), hit.resolved.source);
}

function place(
  placed: PlacedFinding[],
  id: string,
  finding: PlacedFinding['finding'] | null,
): void {
  if (finding !== null) placed.push({ finding, id });
}
