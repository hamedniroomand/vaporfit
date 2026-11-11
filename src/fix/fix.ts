import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PLUGIN_MISSING, PLUGIN_UNKNOWN } from '#format/text.ts';
import type { PluginState, Report } from '#report/types.ts';
import { RULE } from '#rules/messages.ts';

import { MANUAL, planCodemods } from './codemod.ts';
import type { CodemodPlan } from './codemod.ts';

export const FIX_ADD = 'Add vapor to the component.';
export const FIX_MEMO = 'Remove v-memo.';
export const FIX_NONE = 'The tool finds no component that can get vapor.';
export const FIX_NO_WRITE = 'The tool does not write the files.';
export const FIX_WRITE_FLAG = 'Add --write to write the files.';
export const FIX_WROTE = 'The tool writes the files.';

export interface FileChange {
  file: string;
  addVapor: boolean;
  removeMemo: boolean;
}

export interface FixOptions {
  i18n: boolean;
  router: boolean;
  write: boolean;
}

export interface FixResult {
  changes: FileChange[];
  codemods: CodemodPlan[];
  wrote: boolean;
  reason: string | null;
}

export function applyFix(root: string, report: Report, options: FixOptions): FixResult {
  const changes = report.components
    .filter(component => !component.vapor && component.interop === 'ready')
    .map(component => ({
      addVapor: true,
      file: component.file,
      removeMemo: component.findings.some(finding => finding.rule === RULE.memo),
    }));
  const codemods = planCodemods(root, report, options);
  const state = report.project.interopPlugin.state;
  const hasCodemod = codemods.some(item => item.next !== null);
  const canWrite = options.write && state === 'installed' && (changes.length > 0 || hasCodemod);
  if (canWrite) writeChanges(root, changes, codemods);
  return {
    changes,
    codemods,
    reason: state === 'installed' ? null : reasonFor(state),
    wrote: canWrite,
  };
}

function writeChanges(root: string, changes: FileChange[], codemods: CodemodPlan[]): void {
  const next = new Map<string, string>();
  for (const item of codemods) {
    if (item.next !== null) next.set(item.file, item.next);
  }
  for (const change of changes) {
    const current = next.get(change.file) ?? readFileSync(path.join(root, change.file), 'utf8');
    next.set(change.file, editSource(current, change.removeMemo));
  }
  for (const [file, source] of next) writeFileSync(path.join(root, file), source);
}

export function formatFix(result: FixResult): string {
  const lines: string[] = [];
  if (result.changes.length === 0 && result.codemods.length === 0) lines.push(FIX_NONE);
  for (const change of result.changes) {
    lines.push(change.file);
    if (change.addVapor) lines.push(FIX_ADD);
    if (change.removeMemo) lines.push(FIX_MEMO);
  }
  for (const item of result.codemods) lines.push(...codemodLines(item));
  const hasDiff = result.codemods.some(item => item.diff !== null);
  if (result.reason !== null) lines.push(FIX_NO_WRITE, result.reason);
  else if (result.wrote) lines.push(FIX_WROTE);
  else if (result.changes.length > 0 || hasDiff) lines.push(FIX_NO_WRITE, FIX_WRITE_FLAG);
  return `${lines.join('\n')}\n`;
}

function codemodLines(item: CodemodPlan): string[] {
  const lines = [item.file];
  if (item.notes.length > 0) lines.push(MANUAL, ...item.notes);
  if (item.diff !== null) lines.push(...diffLines(item.diff));
  return lines;
}

function diffLines(diff: string): string[] {
  const lines = diff.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function reasonFor(state: PluginState): string {
  return state === 'undetermined' ? PLUGIN_UNKNOWN : PLUGIN_MISSING;
}

function editSource(source: string, removeMemo: boolean): string {
  const next = removeMemo ? stripMemo(source) : source;
  return addVapor(next);
}

function stripMemo(source: string): string {
  return source.replaceAll(/\s+v-memo(?:=(?:"[^"]*"|'[^']*'|[^\s"'>]+))?/gu, '');
}

function addVapor(source: string): string {
  const tag = scriptSetupTag(source);
  if (tag === null) return `<script setup vapor></script>\n${source}`;
  if (hasAttribute(tag.text, 'vapor')) return source;
  return `${source.slice(0, tag.end)} vapor${source.slice(tag.end)}`;
}

function scriptSetupTag(source: string): { end: number; text: string } | null {
  for (const match of source.matchAll(/<script\b/gu)) {
    const start = match.index;
    const end = tagCloser(source, start + 1);
    if (end < 0) continue;
    const text = source.slice(start, end + 1);
    if (hasAttribute(text, 'setup')) return { end, text };
  }
  return null;
}

/** The `>` that closes the tag. A `>` inside quotes is part of the attribute. */
function tagCloser(source: string, from: number): number {
  let quote: string | null = null;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index] ?? '';
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') return index;
  }
  return -1;
}

function hasAttribute(tag: string, name: 'setup' | 'vapor'): boolean {
  const pattern = name === 'setup' ? /\bsetup\b/u : /\bvapor\b/u;
  let quote: string | null = null;
  let plain = '';
  for (const char of tag) {
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      plain += ' ';
      continue;
    }
    plain += char;
  }
  return pattern.test(plain);
}
