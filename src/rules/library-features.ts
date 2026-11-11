import type { Finding } from '#report/types.ts';
import { filled } from '#syntax/filled.ts';

import type { FileContext } from './context.ts';
import { locate } from './context.ts';
import { importHits, propHits } from './features.ts';
import { hitFindings } from './findings.ts';

export function propFindings(file: FileContext): Finding[] {
  const findings: Finding[] = [];
  for (const component of file.template.components) {
    const { resolved } = component;
    if (resolved.kind !== 'import' || !filled(resolved.source)) continue;
    for (const prop of component.props) {
      const use = { component: component.imported, prop: prop.name, source: resolved.source };
      findings.push(...hitFindings(file.project, propHits(file.project, use), prop.location));
    }
  }
  return findings;
}

export function importFindings(file: FileContext): Finding[] {
  const { data } = file.project;
  const findings: Finding[] = [];
  for (const item of file.facts.imports) {
    if (item.kind === 'namespace') continue;
    const hits = importHits(data, item.source, item.imported);
    findings.push(...hitFindings(file.project, hits, locate(file, item.start)));
  }
  return findings;
}
