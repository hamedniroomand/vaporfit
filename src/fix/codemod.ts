import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parse } from '@vue/compiler-sfc';

import { loadCompiler } from '#compiler/vue-compiler.ts';
import type { CompiledFile, TextDiagnostic, VueCompiler } from '#compiler/vue-compiler.ts';
import type { Report } from '#report/types.ts';
import { mergeFacts, readScript } from '#syntax/script.ts';
import type { ScriptFacts } from '#syntax/script.ts';

import { unifiedDiff } from './diff.ts';
import { projectLegacy } from './legacy.ts';
import { i18nLines, routerLines, spliceGlobals } from './setup-edit.ts';
import type { ManualCause, SetupScope } from './setup-edit.ts';
import { scanGlobals, textHasGlobal } from './template-uses.ts';
import type { GlobalUse } from './template-uses.ts';

const I18N_ORDER = ['t', 'd', 'n', 'te', 'tm'] as const;
const ROUTER_ORDER = ['route', 'router'] as const;

export const MANUAL = 'manual';
export const LEGACY_MANUAL = 'The tool cannot see legacy: false. The change is manual.';
export const BLOCK_MANUAL = 'This file has an i18n block. The change is manual.';
export const COMPILE_MANUAL =
  'The Vapor compiler reports an error for the new file. The change is manual.';
export const TEMPLATE_MANUAL = 'The tool cannot read the template. The change is manual.';
export const EXPRESSION_MANUAL = 'The tool cannot read an expression. The change is manual.';
export const SLOT_MANUAL = 'The tool cannot change a slot pattern. The change is manual.';

export function nameManual(name: string): string {
  return `The name ${name} is not free. The change is manual.`;
}

export function callManual(name: string): string {
  return `This file calls ${name}. The change is manual.`;
}

export interface CodemodPlan {
  file: string;
  diff: string | null;
  next: string | null;
  notes: string[];
}

export interface CodemodFlags {
  i18n: boolean;
  router: boolean;
}

type Rewrite =
  | { kind: 'skip' }
  | { kind: 'manual'; reason: string }
  | { kind: 'changed'; source: string };

type Found =
  | { kind: 'skip' }
  | { kind: 'manual'; reason: string }
  | { kind: 'uses'; compiled: CompiledFile; locals: Set<string>; uses: GlobalUse[] };

export interface SfcTarget {
  filename: string;
  id: string;
}

interface CodemodRun {
  root: string;
  compiler: VueCompiler;
  flags: CodemodFlags;
  legacy: 'composition' | 'manual';
}

interface GlobalRewrite {
  /** Local names in the order of the setup lines. The global name has a `$` prefix. */
  names: readonly string[];
  setupLines: (names: readonly string[], scope: SetupScope) => string[] | ManualCause;
  manualReason: (run: CodemodRun, target: SfcTarget, source: string) => string | null;
}

const I18N_REWRITE: GlobalRewrite = {
  manualReason: (run, target, source) => {
    if (run.legacy !== 'composition') return LEGACY_MANUAL;
    return hasI18nBlock(source, target.filename) ? BLOCK_MANUAL : null;
  },
  names: I18N_ORDER,
  setupLines: i18nLines,
};

const ROUTER_REWRITE: GlobalRewrite = {
  manualReason: () => null,
  names: ROUTER_ORDER,
  setupLines: routerLines,
};

export function planCodemods(root: string, report: Report, flags: CodemodFlags): CodemodPlan[] {
  if (!flags.i18n && !flags.router) return [];
  const run: CodemodRun = {
    compiler: loadCompiler(root),
    flags,
    legacy: flags.i18n ? projectLegacy(root) : 'composition',
    root,
  };
  const plans: CodemodPlan[] = [];
  for (const component of report.components) {
    const plan = planFile(run, component);
    if (plan !== null) plans.push(plan);
  }
  return plans;
}

/** True when the Vapor compiler reports an error for `after` that `before` does not have. */
export function vaporChangeRejected(
  compiler: VueCompiler,
  target: SfcTarget,
  change: { before: string; after: string },
): boolean {
  const previous = compiler.compile(change.before, target.filename, target.id);
  const next = compiler.compile(change.after, target.filename, target.id);
  return (
    hasNew(previous.vaporErrors, next.vaporErrors) || hasNew(previous.parseErrors, next.parseErrors)
  );
}

function planFile(run: CodemodRun, component: { file: string; id: string }): CodemodPlan | null {
  const { file } = component;
  const target: SfcTarget = { filename: path.join(run.root, file), id: component.id };
  const source = readFileSync(target.filename, 'utf8');
  let current = source;
  const notes: string[] = [];
  const rewrites = [
    ...(run.flags.i18n ? [I18N_REWRITE] : []),
    ...(run.flags.router ? [ROUTER_REWRITE] : []),
  ];
  for (const rewrite of rewrites) {
    const result = rewriteGlobals(run, target, current, rewrite);
    if (result.kind === 'manual') notes.push(result.reason);
    else if (result.kind === 'changed') current = result.source;
  }
  if (current === source && notes.length === 0) return null;
  return {
    diff: current === source ? null : unifiedDiff(file, source, current),
    file,
    next: current === source ? null : current,
    notes,
  };
}

function rewriteGlobals(
  run: CodemodRun,
  target: SfcTarget,
  source: string,
  rewrite: GlobalRewrite,
): Rewrite {
  const found = findUses(run.compiler, target, source, mapOf(rewrite.names));
  if (found.kind !== 'uses') return found;
  const reason = rewrite.manualReason(run, target, source);
  if (reason !== null) return { kind: 'manual', reason };
  const names = rewrite.names.filter(name => found.uses.some(use => use.local === name));
  const facts = scriptFacts(found.compiled);
  const bound = boundNames(found.compiled.bindings, facts);
  const conflict = names.find(name => bound.has(name) || found.locals.has(name));
  if (conflict !== undefined) return { kind: 'manual', reason: nameManual(conflict) };
  const { compiled, locals } = found;
  const lines = rewrite.setupLines(names, { bound, compiled, facts, locals });
  if (!Array.isArray(lines)) return causeMessage(lines);
  const next = spliceGlobals(source, target.filename, found.uses, lines);
  if (vaporChangeRejected(run.compiler, target, { after: next, before: source })) {
    return { kind: 'manual', reason: COMPILE_MANUAL };
  }
  return { kind: 'changed', source: next };
}

function findUses(
  compiler: VueCompiler,
  target: SfcTarget,
  source: string,
  globals: Map<string, string>,
): Found {
  const compiled = compiler.compile(source, target.filename, target.id);
  if (compiled.template === null) {
    return textHasGlobal(source, globals)
      ? { kind: 'manual', reason: TEMPLATE_MANUAL }
      : { kind: 'skip' };
  }
  const inspection = scanGlobals(compiled.template, compiler, globals);
  if (inspection.unreadable) return { kind: 'manual', reason: EXPRESSION_MANUAL };
  if (inspection.unsafe) return { kind: 'manual', reason: SLOT_MANUAL };
  if (inspection.uses.length === 0) return { kind: 'skip' };
  return { compiled, kind: 'uses', locals: inspection.locals, uses: inspection.uses };
}

function mapOf(names: readonly string[]): Map<string, string> {
  return new Map(names.map(name => [`$${name}`, name]));
}

function causeMessage(cause: ManualCause): Rewrite {
  const reason = cause.cause === 'name' ? nameManual(cause.name) : callManual(cause.name);
  return { kind: 'manual', reason };
}

function hasI18nBlock(source: string, filename: string): boolean {
  try {
    const parsed = parse(source, { filename, ignoreEmpty: false });
    return parsed.descriptor.customBlocks.some(block => block.type === 'i18n');
  } catch {
    return /<i18n[\s>]/u.test(source);
  }
}

function scriptFacts(compiled: CompiledFile): ScriptFacts {
  return mergeFacts(
    [compiled.script, compiled.setup]
      .filter((block): block is { content: string; offset: number } => block !== null)
      .map(block => readScript(block.content, block.offset)),
  );
}

function boundNames(bindings: Record<string, string>, facts: ScriptFacts): Set<string> {
  return new Set([
    ...Object.keys(bindings),
    ...facts.locals.keys(),
    ...facts.imports.map(item => item.local),
  ]);
}

function hasNew(before: TextDiagnostic[], after: TextDiagnostic[]): boolean {
  const known = new Set(before.map(item => firstLine(item.message)));
  return after.some(item => !known.has(firstLine(item.message)));
}

function firstLine(message: string): string {
  return message.split('\n')[0] ?? message;
}
