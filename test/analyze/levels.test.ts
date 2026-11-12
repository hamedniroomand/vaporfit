import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent, listComponents } from '#index.ts';
import type { Report } from '#index.ts';
import manifest from '#pkg' with { type: 'json' };
import { newestDataDate } from '#test/pins.ts';

import { described, must, textAt } from './assert.ts';

const root = path.join(import.meta.dirname, '../fixtures/rules');

function rulesReport(): Report {
  return analyze(root);
}

describe('level table', () => {
  const report = rulesReport();

  it('sorts components and records the tool version', () => {
    expect(report.tool).toEqual({ data: newestDataDate(), version: manifest.version });
    const ids = report.components.map(item => item.id);
    expect(ids).toEqual([...ids].toSorted());
  });

  it('blocks a normal script', () => {
    const id = 'src/Options.vue';
    const finding = must(
      getComponent(report, id)?.findings.find(item => item.rule === 'vapor/options-api'),
      described(report, id),
    );
    expect(finding.level).toBe('error');
    expect(finding.failure).toBe('compile');
    expect(getComponent(report, id)?.interop).toBe('blocked');
    expect(getComponent(report, id)?.vapor).toBe(false);
  });

  it('blocks a local object directive and records the definition', () => {
    for (const id of ['src/Object.vue', 'src/ObjectPlain.vue', 'src/ScriptVapor.vue']) {
      const finding = must(
        getComponent(report, id)?.findings.find(item => item.rule === 'vapor/object-directive'),
        described(report, id),
      );
      expect(finding.level).toBe('error');
      expect(textAt(path.join(root, id), finding, 'v-mark'.length)).toBe('v-mark');
      const definition = finding.definition;
      if (definition === undefined) throw new Error(described(report, id));
      const line = readFileSync(path.join(root, id), 'utf8').split('\n')[definition.line - 1] ?? '';
      expect(line.slice(definition.column - 1, definition.column + 4)).toBe('vMark');
    }
  });

  it('gives no finding for a local function directive', () => {
    expect(getComponent(report, 'src/FunctionDirective.vue')?.findings).toEqual([]);
    expect(getComponent(report, 'src/FunctionDirective.vue')?.interop).toBe('ready');
  });
});

describe('compiler selection', () => {
  it('uses the tool compiler for the hoisted Vue 3.5 project', () => {
    const report = rulesReport();
    expect(report.project.vue).toBe('3.5.45');
    expect(report.project.compiler.source).toBe('tool');
  });
});

describe('template notes', () => {
  const report = rulesReport();

  it('blocks an element vnode hook and notes v-memo', () => {
    const hook = must(
      getComponent(report, 'src/Hook.vue')?.findings.find(item => item.rule === 'vapor/vnode-hook'),
      described(report, 'src/Hook.vue'),
    );
    expect(hook.level).toBe('error');
    expect(textAt(path.join(root, 'src/Hook.vue'), hook, '@vue:mounted'.length)).toBe(
      '@vue:mounted',
    );
    const memo = must(
      getComponent(report, 'src/Memo.vue')?.findings.find(item => item.rule === 'vapor/v-memo'),
      described(report, 'src/Memo.vue'),
    );
    expect(memo.level).toBe('note');
    expect(memo.failure).toBe('none');
    expect(getComponent(report, 'src/Memo.vue')?.interop).toBe('ready');
  });

  it('blocks a same-file component ref and ignores other refs', () => {
    for (const id of ['src/Ref.vue', 'src/RefScript.vue']) {
      const finding = must(
        getComponent(report, id)?.findings.find(
          item => item.rule === 'vapor/component-ref-instance',
        ),
        described(report, id),
      );
      expect(finding.level).toBe('error');
      expect(textAt(path.join(root, id), finding, '$el'.length)).toBe('$el');
    }
    expect(getComponent(report, 'src/RefElement.vue')?.interop).toBe('ready');
    expect(getComponent(report, 'src/RefLibrary.vue')?.interop).toBe('ready');
  });
});

describe('script and names', () => {
  const report = rulesReport();

  it('reports instance calls, slot calls, and unbound names', () => {
    for (const id of ['src/Instance.vue', 'src/InstanceAlias.vue', 'src/InstanceNamespace.vue']) {
      const finding = must(
        getComponent(report, id)?.findings.find(item => item.rule === 'vapor/get-current-instance'),
        described(report, id),
      );
      expect(finding.level).toBe('unknown');
      expect(finding.failure).toBe('runtime-error');
    }
    for (const id of [
      'src/Slot.vue',
      'src/SlotOptional.vue',
      'src/SlotDestructure.vue',
      'src/SlotMacro.vue',
    ]) {
      expect(
        getComponent(report, id)?.findings.some(
          item => item.rule === 'vapor/slot-dry-run' && item.level === 'unknown',
        ),
      ).toBe(true);
    }
    const global = must(
      getComponent(report, 'src/Global.vue')?.findings.find(
        item => item.rule === 'vapor/global-property',
      ),
      described(report, 'src/Global.vue'),
    );
    expect(textAt(path.join(root, 'src/Global.vue'), global, 'missing'.length)).toBe('missing');
    expect(getComponent(report, 'src/Excluded.vue')?.findings).toEqual([]);
    expect(getComponent(report, 'src/StyleModule.vue')?.findings).toEqual([]);
    expect(getComponent(report, 'src/Excluded.vue')?.unresolved).toEqual(['Child']);
  });
});

describe('directives and queries', () => {
  const report = rulesReport();

  it('reports directives the data does not describe', () => {
    const unknown = must(
      getComponent(report, 'src/UnknownDirective.vue')?.findings[0],
      described(report, 'src/UnknownDirective.vue'),
    );
    expect(unknown.rule).toBe('vapor/unknown-directive');
    expect(unknown.level).toBe('unknown');
    expect(unknown.failure).toBe('runtime-error');
    expect(unknown.message).toContain('not in the data');
    const local = getComponent(report, 'src/LocalDirective.vue')?.findings[0];
    expect(local?.rule).toBe('vapor/unknown-directive');
    expect(local?.message).toContain('local file');
    const unread = getComponent(report, 'src/UnreadDirective.vue');
    expect(unread?.findings[0]?.rule).toBe('vapor/unknown-directive');
    expect(unread?.interop).toBe('unknown');
    const known = getComponent(report, 'src/KnownMiss.vue');
    expect(known?.findings).toEqual([]);
    expect(known?.interop).toBe('ready');
  });

  it('filters components by verdict', () => {
    expect(
      listComponents(report, { verdict: 'blocked' }).every(item => item.interop === 'blocked'),
    ).toBe(true);
    expect(listComponents(report).length).toBe(report.components.length);
    expect(getComponent(report, 'missing.vue')).toBeUndefined();
  });
});
