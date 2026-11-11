import type { SourceLocation } from '#report/types.ts';
import type { FileAnalysis } from '#rules/file.ts';
import type { PlacedFinding, SourceMark } from '#rules/findings.ts';
import { toolFinding } from '#rules/findings.ts';
import { RULE, TEXT } from '#rules/messages.ts';
import { locationAt } from '#syntax/position.ts';
import type { TemplateComponent } from '#syntax/template.ts';

import type { LinkContext } from './context.ts';
import { targetOfDynamicUse, targetOfUse } from './context.ts';

interface RefReads {
  template: { start: number }[];
  script: { start: number }[];
}

interface RefPlace {
  id: string;
  mark: SourceMark;
  location: SourceLocation;
}

interface RefVerdict {
  level: 'error' | 'unknown';
  message: string;
  chain: string[] | undefined;
}

/**
 * A read of `$el`, `$props`, `$attrs`, `$slots` or `$refs` through a template ref to a component
 * in another file. The file with the read and the target file each get a finding.
 */
export function refFindings(link: LinkContext, file: FileAnalysis): PlacedFinding[] {
  const placed: PlacedFinding[] = [];
  const reported = new Set<string>();
  for (const component of file.template.components) {
    placed.push(...componentRefFindings(link, file, component, reported));
  }
  if (link.registries.unreadable.has(file.absolute)) {
    placed.push(
      fileFinding(link, file, 'script', {
        chain: undefined,
        level: 'unknown',
        message: TEXT.refUsers,
      }),
    );
  }
  return placed;
}

function componentRefFindings(
  link: LinkContext,
  file: FileAnalysis,
  component: TemplateComponent,
  reported: Set<string>,
): PlacedFinding[] {
  if (component.ref === null) return [];
  const reads: RefReads = {
    script: file.facts.refAccess.filter(item => item.ref === component.ref),
    template: file.template.refAccess.filter(item => item.ref === component.ref),
  };
  if (reads.template.length === 0 && reads.script.length === 0) return [];
  if (component.dynamic) return dynamicRefFindings(link, file, component, reads);
  const target = targetOfUse(link, file, component);
  const child = target?.kind === 'file' ? link.files.get(target.file) : undefined;
  if (child === undefined || child.report.id === file.report.id) return [];
  const chain = [file.report.id, child.report.id];
  const placed = readFindings(link, file, reads, { chain, level: 'error', message: TEXT.refOther });
  if (reported.has(child.report.id)) return placed;
  reported.add(child.report.id);
  placed.push(
    fileFinding(link, child, 'template', { chain, level: 'error', message: TEXT.refTarget }),
  );
  return placed;
}

/** `<component :is>` with a ref. The tool cannot be sure which component gets the read. */
function dynamicRefFindings(
  link: LinkContext,
  file: FileAnalysis,
  component: TemplateComponent,
  reads: RefReads,
): PlacedFinding[] {
  const target = targetOfDynamicUse(link, file, component);
  const found = target?.kind === 'file' ? link.files.get(target.file) : undefined;
  const child = found !== undefined && found.report.id !== file.report.id ? found : undefined;
  const verdict: RefVerdict = {
    chain: child === undefined ? undefined : [file.report.id, child.report.id],
    level: 'unknown',
    message: TEXT.refUsers,
  };
  const placed = readFindings(link, file, reads, verdict);
  if (child !== undefined) placed.push(fileFinding(link, child, 'template', verdict));
  return placed;
}

function readFindings(
  link: LinkContext,
  file: FileAnalysis,
  reads: RefReads,
  verdict: RefVerdict,
): PlacedFinding[] {
  const place = (start: number, mark: SourceMark): RefPlace => ({
    id: file.report.id,
    location: locationAt(file.report.id, file.source, start),
    mark,
  });
  return [
    ...reads.template.map(item => refFinding(link, verdict, place(item.start, 'template'))),
    ...reads.script.map(item => refFinding(link, verdict, place(item.start, 'script'))),
  ];
}

function fileFinding(
  link: LinkContext,
  file: FileAnalysis,
  mark: SourceMark,
  verdict: RefVerdict,
): PlacedFinding {
  const id = file.report.id;
  return refFinding(link, verdict, { id, location: { column: 1, file: id, line: 1 }, mark });
}

function refFinding(link: LinkContext, verdict: RefVerdict, place: RefPlace): PlacedFinding {
  const finding = toolFinding(link.project.data, {
    level: verdict.level,
    location: place.location,
    mark: place.mark,
    message: verdict.message,
    rule: RULE.ref,
    ...(verdict.chain === undefined ? {} : { chain: verdict.chain }),
  });
  return { finding, id: place.id };
}
