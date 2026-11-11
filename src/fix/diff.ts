interface Edit {
  kind: 'keep' | 'remove' | 'add';
  line: string;
}

export function unifiedDiff(file: string, before: string, after: string): string {
  if (before === after) return '';
  const oldLines = linesOf(before);
  const newLines = linesOf(after);
  const edits = lineEdits(oldLines, newLines);
  const hunks = hunksOf(edits);
  const body = hunks.map(hunk => renderHunk(hunk)).join('');
  return `--- ${file}\n+++ ${file}\n${body}`;
}

function linesOf(text: string): string[] {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
}

function lineEdits(before: string[], after: string[]): Edit[] {
  const table = lcs(before, after);
  const edits: Edit[] = [];
  let left = 0;
  let right = 0;
  while (left < before.length && right < after.length) {
    if (before[left] === after[right]) {
      edits.push({ kind: 'keep', line: before[left] ?? '' });
      left += 1;
      right += 1;
      continue;
    }
    const down = table[left + 1]?.[right] ?? 0;
    const across = table[left]?.[right + 1] ?? 0;
    if (down >= across) {
      edits.push({ kind: 'remove', line: before[left] ?? '' });
      left += 1;
    } else {
      edits.push({ kind: 'add', line: after[right] ?? '' });
      right += 1;
    }
  }
  while (left < before.length) {
    edits.push({ kind: 'remove', line: before[left] ?? '' });
    left += 1;
  }
  while (right < after.length) {
    edits.push({ kind: 'add', line: after[right] ?? '' });
    right += 1;
  }
  return edits;
}

function lcs(before: string[], after: string[]): number[][] {
  const table = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );
  for (let left = before.length - 1; left >= 0; left -= 1) {
    const row = table[left];
    const next = table[left + 1];
    if (row === undefined || next === undefined) continue;
    for (let right = after.length - 1; right >= 0; right -= 1) {
      row[right] =
        before[left] === after[right]
          ? (next[right + 1] ?? 0) + 1
          : Math.max(next[right] ?? 0, row[right + 1] ?? 0);
    }
  }
  return table;
}

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

function hunksOf(edits: Edit[]): Hunk[] {
  const context = 3;
  const hunks: Hunk[] = [];
  let oldLine = 1;
  let newLine = 1;
  let index = 0;
  while (index < edits.length) {
    if (edits[index]?.kind === 'keep') {
      oldLine += 1;
      newLine += 1;
      index += 1;
      continue;
    }
    const start = Math.max(0, index - context);
    let end = index;
    while (end < edits.length) {
      const nextChange = edits.slice(end).findIndex(edit => edit.kind !== 'keep');
      if (nextChange < 0) break;
      if (nextChange > context * 2) break;
      end += nextChange + 1;
    }
    const sliceEnd = Math.min(edits.length, end + context);
    hunks.push(
      hunkFrom(edits.slice(start, sliceEnd), oldLine - (index - start), newLine - (index - start)),
    );
    for (let cursor = index; cursor < sliceEnd; cursor += 1) {
      const edit = edits[cursor];
      if (edit?.kind !== 'add') oldLine += 1;
      if (edit?.kind !== 'remove') newLine += 1;
    }
    index = sliceEnd;
  }
  return hunks;
}

function hunkFrom(edits: Edit[], oldStart: number, newStart: number): Hunk {
  const lines: string[] = [];
  let oldCount = 0;
  let newCount = 0;
  for (const edit of edits) {
    if (edit.kind === 'keep') {
      lines.push(` ${edit.line}`);
      oldCount += 1;
      newCount += 1;
    } else if (edit.kind === 'remove') {
      lines.push(`-${edit.line}`);
      oldCount += 1;
    } else {
      lines.push(`+${edit.line}`);
      newCount += 1;
    }
  }
  return { lines, newCount, newStart, oldCount, oldStart };
}

function renderHunk(hunk: Hunk): string {
  const header = `@@ -${range(hunk.oldStart, hunk.oldCount)} +${range(hunk.newStart, hunk.newCount)} @@\n`;
  return `${header}${hunk.lines.map(line => `${line}\n`).join('')}`;
}

function range(start: number, count: number): string {
  if (count === 1) return String(start);
  return `${start},${count}`;
}
