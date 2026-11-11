import { readFileSync } from 'node:fs';

import { relativeId } from '#project/files.ts';
import type { Project } from '#project/project.ts';
import { verdictOf } from '#report/summary.ts';
import type { ComponentReport } from '#report/types.ts';
import type { ScriptFacts } from '#syntax/script.ts';
import { mergeFacts, readScript, topLevelAwait } from '#syntax/script.ts';
import type { TemplateFacts } from '#syntax/template.ts';
import { inspectTemplate } from '#syntax/template.ts';

import type { FileContext } from './context.ts';
import { FILE_RULES } from './file-rules.ts';
import { uniqueFindings } from './findings.ts';

export interface FileAnalysis {
  absolute: string;
  awaitAt: number | null;
  bindings: Record<string, string>;
  facts: ScriptFacts;
  report: ComponentReport;
  source: string;
  template: TemplateFacts;
}

export function analyzeFile(project: Project, file: string): FileAnalysis {
  const { compiler } = project;
  const id = relativeId(project.root, file);
  const source = readFileSync(file, 'utf8');
  const compiled = compiler.compile(source, file, id);
  const facts = mergeFacts(
    [compiled.script, compiled.setup]
      .filter(block => block !== null)
      .map(block => readScript(block.content, block.offset)),
  );
  const template = inspectTemplate(compiled, facts, compiler, id);
  const context: FileContext = { compiled, facts, id, project, source, template };
  const findings = uniqueFindings(FILE_RULES.flatMap(rule => rule(context)));
  const { setup } = compiled;
  return {
    absolute: file,
    awaitAt: setup === null ? null : topLevelAwait(setup.content, setup.offset),
    bindings: compiled.bindings,
    facts,
    report: {
      file: id,
      findings,
      id,
      interop: verdictOf(findings),
      pure: 'unknown',
      unresolved: template.unresolved,
      vapor: compiled.vapor,
    },
    source,
    template,
  };
}
