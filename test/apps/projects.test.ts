import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import type { Report } from '#index.ts';
import { captureIo } from '#test/capture.ts';

const repoRoot = path.join(import.meta.dirname, '../..');
const elementRoot = path.join(repoRoot, 'apps/element-plus-example');

function filesIn(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesIn(full));
    else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.json'))) {
      found.push(full);
    }
  }
  return found;
}

function toolText(): string {
  return filesIn(path.join(repoRoot, 'src'))
    .concat(filesIn(path.join(repoRoot, 'data')))
    .map(file => readFileSync(file, 'utf8'))
    .join('\n');
}

function sentences(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.endsWith('.'));
}

function allowedExit(report: Report, code: number): boolean {
  if (code === 0) return true;
  if (code !== 1) return false;
  if (report.project.interopPlugin.level === 'error') return true;
  return report.components.some(component => component.vapor && component.interop === 'blocked');
}

describe('pinned projects', () => {
  it('checks the Element Plus Vite playground', async () => {
    expect(statSync(elementRoot).isDirectory()).toBe(true);
    const pin = readFileSync(path.join(elementRoot, 'PIN'), 'utf8').trim();
    expect(pin).toMatch(/^[0-9a-f]{40}$/u);

    const textIo = captureIo(elementRoot);
    const textCode = await run([], textIo);
    const jsonIo = captureIo(elementRoot);
    const jsonCode = await run(['--json'], jsonIo);
    const report = JSON.parse(jsonIo.output()) as Report;
    expect(jsonCode).toBe(textCode);
    expect(report.schemaVersion).toBe(0);
    expect(
      report.summary.pure.ready + report.summary.pure.blocked + report.summary.pure.unknown,
    ).toBe(report.summary.components);
    expect(allowedExit(report, textCode)).toBe(true);

    const messages = report.components.flatMap(component =>
      component.findings.map(finding => finding.message),
    );
    const corpus = toolText();
    for (const sentence of sentences(textIo.output())) {
      const known =
        corpus.includes(sentence) || messages.some(message => message.includes(sentence));
      // A failure shows the sentence that the tool text does not have.
      expect(known ? '' : sentence).toBe('');
    }
  });
});
