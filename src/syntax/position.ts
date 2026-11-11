import type { SourceLocation } from '#report/types.ts';

/** 1-based line and column of a character offset. */
export function positionAt(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  const end = Math.min(Math.max(offset, 0), source.length);
  for (let index = 0; index < end; index += 1) {
    if (source[index] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function locationAt(file: string, source: string, offset: number): SourceLocation {
  const position = positionAt(source, offset);
  return { file, line: position.line, column: position.column };
}

/** Location of the first caret in a Vue compiler code frame. The caret prefix is six characters. */
export function frameLocation(tip: string): { line: number; column: number } | null {
  const lines = tip.split('\n');
  const prefix = '   |  ';
  for (let index = 1; index < lines.length; index += 1) {
    const caret = lines[index] ?? '';
    const sourceLine = lines[index - 1] ?? '';
    const caretAt = caret.indexOf('^');
    if (!caret.startsWith(prefix) || caretAt < 0) continue;
    const lineMatch = /^\s*(\d+)\s*\|/u.exec(sourceLine);
    const lineText = lineMatch?.[1];
    if (lineText === undefined || lineText.length === 0) continue;
    return { line: Number(lineText), column: caretAt - prefix.length + 1 };
  }
  return null;
}
