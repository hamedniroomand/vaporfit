import type { CompatData, Failure } from '#data/types.ts';
import type { Project } from '#project/project.ts';
import type { Finding, Level, SourceLocation } from '#report/types.ts';

import type { FeatureDecision, FeatureHit } from './features.ts';
import { decideFeature } from './features.ts';
import { RULE } from './messages.ts';

export type SourceMark = 'template' | 'script' | 'compiler' | 'project';

export interface ToolFinding {
  rule: string;
  level: Level;
  message: string;
  location: SourceLocation;
  mark: SourceMark;
  definition?: SourceLocation;
  chain?: string[];
}

/** Where a library feature finding goes. `level` replaces the level that the data gives. */
export interface FeaturePlace {
  location: SourceLocation;
  chain: string[];
  level?: Level | undefined;
}

export interface PlacedFinding {
  finding: Finding;
  id: string;
}

export function toolFinding(data: CompatData, parts: ToolFinding): Finding {
  const finding: Finding = {
    evidence: [parts.mark],
    failure: failureOf(data, parts.rule),
    level: parts.level,
    location: parts.location,
    message: parts.message,
    rule: parts.rule,
  };
  if (parts.definition !== undefined) finding.definition = parts.definition;
  if (parts.chain !== undefined) finding.chain = parts.chain;
  return finding;
}

export function hitFindings(
  project: Project,
  hits: FeatureHit[],
  location: SourceLocation,
): Finding[] {
  const findings: Finding[] = [];
  for (const hit of hits) {
    const version = project.versionOf(hit.library.package);
    const decision = decideFeature(hit, version, location.file);
    if (decision !== null) findings.push(fromDecision(decision, location));
  }
  return findings;
}

export function featureFinding(
  project: Project,
  hit: FeatureHit,
  place: FeaturePlace,
): Finding | null {
  const version = project.versionOf(hit.library.package);
  const decision = decideFeature(hit, version, place.chain[0] ?? place.location.file);
  if (decision === null) return null;
  const finding = fromDecision(decision, place.location);
  finding.chain = place.chain;
  if (place.level !== undefined) finding.level = place.level;
  return finding;
}

export function uniqueFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const result: Finding[] = [];
  for (const finding of findings) {
    const key = [
      finding.rule,
      finding.level,
      finding.location.line,
      finding.location.column,
      finding.message,
      finding.chain?.join('>') ?? '',
    ].join('\0');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(finding);
  }
  return result.toSorted(
    (left, right) =>
      left.location.line - right.location.line ||
      left.location.column - right.location.column ||
      left.rule.localeCompare(right.rule),
  );
}

function fromDecision(decision: FeatureDecision, location: SourceLocation): Finding {
  return {
    chain: decision.chain,
    evidence: decision.evidence,
    failure: decision.failure,
    level: decision.level,
    location,
    message: decision.message,
    package: decision.package,
    rule: decision.rule,
  };
}

function failureOf(data: CompatData, rule: string): Failure {
  if (rule === RULE.compiler) return 'compile';
  // This rule has no data file. Do not reuse the silent failure of vapor/object-directive.
  if (rule === RULE.unknown) return 'runtime-error';
  return data.rules.find(item => item.id === rule)?.failure ?? 'silent';
}
