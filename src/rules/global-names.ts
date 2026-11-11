import type { Finding } from '#report/types.ts';

import type { FileContext } from './context.ts';
import { locate } from './context.ts';
import { globalPropertyHits } from './features.ts';
import { hitFindings, toolFinding } from './findings.ts';
import { RULE, unboundName } from './messages.ts';

/** Names that the Vapor compiler does not prefix, or that Vue always allows. */
const SPECIAL = new Set(['$props', '$emit', '$attrs', '$slots', 'require']);

/**
 * A template name that is not a binding of the file, for example `$t` or `$route`.
 * A library that the data knows gives its own finding. Each other name is unknown.
 */
export function nameFindings(file: FileContext): Finding[] {
  const { data, installed } = file.project;
  const unbound = unboundNames(file);
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const use of file.template.names) {
    const key = `${use.name}:${use.offset}`;
    if (!unbound.has(use.name) || seen.has(key)) continue;
    seen.add(key);
    const location = locate(file, use.offset);
    const hits = globalPropertyHits(data, installed, use.name);
    if (hits.length > 0) {
      findings.push(...hitFindings(file.project, hits, location));
      continue;
    }
    findings.push(
      toolFinding(data, {
        level: 'unknown',
        location,
        mark: 'template',
        message: unboundName(use.name),
        rule: RULE.global,
      }),
    );
  }
  return findings;
}

/** Names that the compiled render function reads from the instance, not from the bindings. */
function unboundNames(file: FileContext): Set<string> {
  const { compiled } = file;
  const { compiler } = file.project;
  const names = contextNames(compiled.code);
  for (const name of Object.keys(compiled.bindings)) names.delete(name);
  for (const name of names) {
    if (SPECIAL.has(name) || compiler.isGloballyAllowed(name)) names.delete(name);
    if (name === '$style' && compiled.moduleStyle) names.delete(name);
  }
  return names;
}

function contextNames(code: string): Set<string> {
  const names = new Set<string>();
  for (const match of code.matchAll(/_ctx(?:\?\.)?\.([A-Za-z_$][\w$]*)/gu)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  for (const match of code.matchAll(/_ctx\[\s*['"]([A-Za-z_$][\w$]*)['"]\s*\]/gu)) {
    const name = match[1];
    if (name !== undefined) names.add(name);
  }
  return names;
}
