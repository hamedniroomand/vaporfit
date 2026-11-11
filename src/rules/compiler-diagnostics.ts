import type { TextDiagnostic } from '#compiler/vue-compiler.ts';
import type { Finding } from '#report/types.ts';
import { frameLocation } from '#syntax/position.ts';

import type { FileContext } from './context.ts';
import { toolFinding } from './findings.ts';
import { RULE, TEXT } from './messages.ts';

export function compilerFindings(file: FileContext): Finding[] {
  const tips = tipFindings(file);
  return [...tips.findings, ...errorFindings(file), ...knownTipFindings(file, tips)];
}

/** Reads the Vapor tips. The v-memo tip and the vnode hook tip become flags, not findings. */
function tipFindings(file: FileContext): { findings: Finding[]; memo: boolean; hook: boolean } {
  const { compiler } = file.project;
  const findings: Finding[] = [];
  let memo = false;
  let hook = false;
  for (const tip of file.compiled.vaporTips) {
    const first = firstLine(tip);
    if (compiler.memoMessage !== null && first === compiler.memoMessage) {
      memo = true;
      continue;
    }
    if (compiler.hookMessage !== null && first === compiler.hookMessage) {
      hook = true;
      continue;
    }
    findings.push(otherTip(file, tip));
  }
  return { findings, hook, memo };
}

function otherTip(file: FileContext, tip: string): Finding {
  const first = firstLine(tip);
  const shared = file.compiled.baselineTips.some(item => firstLine(item) === first);
  const frame = frameLocation(tip);
  return compilerFinding(file, shared ? TEXT.sharedCompiler : first, {
    column: frame?.column ?? 1,
    line: frame?.line ?? 1,
  });
}

function errorFindings(file: FileContext): Finding[] {
  const { compiled } = file;
  const { optionsMessage } = file.project.compiler;
  const findings: Finding[] = [];
  for (const error of compiled.vaporErrors) {
    if (isOptions(error.message, optionsMessage)) {
      findings.push(optionsFinding(file, error));
      continue;
    }
    const first = firstLine(error.message);
    const shared = compiled.baselineErrors.some(item => firstLine(item.message) === first);
    findings.push(compilerFinding(file, shared ? TEXT.sharedCompiler : first, error));
  }
  for (const error of compiled.parseErrors) {
    if (isOptions(error.message, optionsMessage)) findings.push(optionsFinding(file, error));
    else findings.push(compilerFinding(file, TEXT.sharedCompiler, error));
  }
  return findings;
}

function knownTipFindings(file: FileContext, tips: { memo: boolean; hook: boolean }): Finding[] {
  const { data } = file.project;
  const findings: Finding[] = [];
  if (tips.memo) {
    for (const location of file.template.memos) {
      findings.push(
        toolFinding(data, {
          level: 'note',
          location,
          mark: 'compiler',
          message: TEXT.memo,
          rule: RULE.memo,
        }),
      );
    }
  }
  if (tips.hook) {
    for (const location of file.template.hooks) {
      findings.push(
        toolFinding(data, {
          level: 'error',
          location,
          mark: 'compiler',
          message: TEXT.hook,
          rule: RULE.hook,
        }),
      );
    }
  }
  return findings;
}

function compilerFinding(
  file: FileContext,
  message: string,
  position: Pick<TextDiagnostic, 'line' | 'column'>,
): Finding {
  return {
    evidence: ['compiler'],
    failure: 'compile',
    level: 'unknown',
    location: { column: position.column, file: file.id, line: position.line },
    message,
    rule: RULE.compiler,
  };
}

function optionsFinding(
  file: FileContext,
  position: Pick<TextDiagnostic, 'line' | 'column'>,
): Finding {
  return toolFinding(file.project.data, {
    level: 'error',
    location: { column: position.column, file: file.id, line: position.line },
    mark: 'compiler',
    message: TEXT.options,
    rule: RULE.options,
  });
}

function isOptions(message: string, probe: string): boolean {
  if (probe.length === 0) return false;
  const core = probe.replace(/^\[@vue\/compiler-sfc\]\s*/u, '');
  return message.includes(core);
}

function firstLine(value: string): string {
  return value.split('\n')[0] ?? value;
}
