import { nuxtProject } from '#project/plugin.ts';
import type { Finding, SourceLocation, Verdict } from '#report/types.ts';
import type { FileAnalysis } from '#rules/file.ts';
import { toolFinding, uniqueFindings } from '#rules/findings.ts';
import { RULE, TEXT } from '#rules/messages.ts';
import { locationAt } from '#syntax/position.ts';
import type { TemplateComponent } from '#syntax/template.ts';

import type { LinkContext } from './context.ts';
import { classifyComponent, openPureSession } from './pure-target.ts';
import type { ChildHit, PureSession } from './pure-target.ts';

interface Walk {
  session: PureSession;
  /** A Nuxt project supports interop mode only. No component is pure ready. */
  nuxt: boolean;
  verdicts: Map<string, Verdict>;
  /** Files that the walk judges now. A file in this set is part of a cycle. */
  stack: Set<string>;
}

interface Judgment {
  findings: Finding[];
  blocked: boolean;
  unknown: boolean;
}

type BlockingChild = Extract<ChildHit, { kind: 'library' | 'jsx' | 'render' }>;

/** Sets `pure` and the pure-tier findings. A local Vue child is judged before its parent. */
export function applyPure(link: LinkContext): void {
  const walk: Walk = {
    nuxt: nuxtProject(link.project.root),
    session: openPureSession(link),
    stack: new Set(),
    verdicts: new Map(),
  };
  for (const file of link.files.values()) judge(walk, file);
}

function judge(walk: Walk, file: FileAnalysis): Verdict {
  const known = walk.verdicts.get(file.absolute);
  if (known !== undefined) return known;
  if (walk.stack.has(file.absolute)) return 'unknown';
  walk.stack.add(file.absolute);
  const verdict = decide(walk, file);
  walk.stack.delete(file.absolute);
  walk.verdicts.set(file.absolute, verdict);
  file.report.pure = verdict;
  return verdict;
}

function decide(walk: Walk, file: FileAnalysis): Verdict {
  const { report } = file;
  // Nuxt blocks the pure tier for each component, so other pure causes are only noise.
  if (walk.nuxt) {
    report.findings = uniqueFindings([...report.findings, nuxtFinding(walk, file)]);
    return 'blocked';
  }
  const judgment: Judgment = {
    blocked: report.interop === 'blocked' || file.awaitAt !== null,
    findings: [],
    unknown: report.interop === 'unknown' || report.unresolved.length > 0,
  };
  if (file.awaitAt !== null) judgment.findings.push(awaitFinding(walk, file));
  for (const component of file.template.components) judgeChild(walk, file, component, judgment);
  const verdict = pureVerdict(judgment);
  if (verdict === 'ready' && !report.vapor) judgment.findings.push(convertFinding(walk, file));
  report.findings = uniqueFindings([...report.findings, ...judgment.findings]);
  return verdict;
}

function judgeChild(
  walk: Walk,
  file: FileAnalysis,
  component: TemplateComponent,
  judgment: Judgment,
): void {
  const child = classifyComponent(walk.session, file, component);
  if (child.kind === 'skip' || child.kind === 'vapor') return;
  if (child.kind === 'unknown') {
    judgment.unknown = true;
    return;
  }
  if (child.kind === 'vue') {
    const verdict = judge(walk, child.file);
    if (verdict === 'ready') return;
    if (verdict === 'blocked') judgment.blocked = true;
    else judgment.unknown = true;
    judgment.findings.push(...childCauses(walk, file, child, verdict));
    return;
  }
  judgment.blocked = true;
  judgment.findings.push(blockFinding(walk, file, child));
}

function pureVerdict(judgment: Judgment): Verdict {
  if (judgment.blocked) return 'blocked';
  if (judgment.unknown) return 'unknown';
  return 'ready';
}

function blockFinding(walk: Walk, file: FileAnalysis, child: BlockingChild): Finding {
  const finding = vdomFinding(walk, child.location, [file.report.id, child.tail]);
  if (child.kind !== 'library') return finding;
  finding.package = { name: child.packageName, verified: child.verified, version: child.version };
  finding.declared = child.declared;
  return finding;
}

/**
 * A Vapor child gives all its causes. A VDOM child gives only its VDOM causes, because the child
 * itself is the blocker. A finding that already names the parent is not copied again.
 */
function childCauses(
  walk: Walk,
  file: FileAnalysis,
  hit: { file: FileAnalysis; location: SourceLocation },
  verdict: 'blocked' | 'unknown',
): Finding[] {
  const parentId = file.report.id;
  const child = hit.file.report;
  const level = verdict === 'blocked' ? 'error' : 'unknown';
  const causes = child.findings.filter(
    finding =>
      finding.level === level &&
      (child.vapor || finding.rule === RULE.vdom) &&
      !(finding.chain ?? []).includes(parentId),
  );
  if (causes.length === 0 && verdict === 'blocked' && !child.vapor) {
    return [vdomFinding(walk, hit.location, [parentId, child.id])];
  }
  return causes.map(finding => liftCause(finding, [parentId, child.id], hit.location));
}

function liftCause(finding: Finding, ids: [string, string], location: SourceLocation): Finding {
  const [parentId, childId] = ids;
  const chain = [parentId, ...(finding.chain ?? [childId])];
  return { ...finding, chain, location };
}

function vdomFinding(walk: Walk, location: SourceLocation, chain: string[]): Finding {
  return toolFinding(walk.session.link.project.data, {
    chain,
    level: 'error',
    location,
    mark: 'template',
    message: TEXT.vdom,
    rule: RULE.vdom,
  });
}

function awaitFinding(walk: Walk, file: FileAnalysis): Finding {
  return toolFinding(walk.session.link.project.data, {
    level: 'error',
    location: locationAt(file.report.id, file.source, file.awaitAt ?? 0),
    mark: 'script',
    message: TEXT.asyncSetup,
    rule: RULE.asyncSetup,
  });
}

function nuxtFinding(walk: Walk, file: FileAnalysis): Finding {
  return toolFinding(walk.session.link.project.data, {
    level: 'error',
    location: { column: 1, file: file.report.id, line: 1 },
    mark: 'project',
    message: TEXT.nuxt,
    rule: RULE.nuxt,
  });
}

function convertFinding(walk: Walk, file: FileAnalysis): Finding {
  const index = file.source.indexOf('<script');
  const location =
    index < 0
      ? { column: 1, file: file.report.id, line: 1 }
      : locationAt(file.report.id, file.source, index);
  return toolFinding(walk.session.link.project.data, {
    level: 'note',
    location,
    mark: 'script',
    message: TEXT.convert,
    rule: RULE.vdom,
  });
}
