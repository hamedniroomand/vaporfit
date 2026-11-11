import { watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';

import { analyze, analyzeFiles } from '#index.ts';
import type { Report } from '#index.ts';

const SKIP = new Set(['node_modules', 'dist', '.output', '.nuxt', 'coverage', '.git']);
const watching = new Set<ReportHandle>();

export function closeWatchedReports(): void {
  const handles = [...watching];
  watching.clear();
  for (const handle of handles) handle.close();
}

/** Keeps one report. The first read is a full analyze. Later paths use analyzeFiles. */
export function openReport(root: string, follow: boolean): ReportHandle {
  let report = analyze(root);
  const pending: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  const watcher = follow ? watchRoot(root, note) : undefined;
  const handle: ReportHandle = {
    close(): void {
      if (closed) return;
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      watcher?.close();
      watching.delete(handle);
    },
    note,
    read: () => report,
  };
  if (follow) watching.add(handle);
  return handle;

  function note(file: string): void {
    pending.push(file);
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      const paths = pending.splice(0);
      if (paths.length === 0) return;
      try {
        report = analyzeFiles(root, paths, report);
      } catch {
        report = analyze(root);
      }
    }, 40);
    timer.unref();
  }
}

export interface ReportHandle {
  read: () => Report;
  note: (file: string) => void;
  close: () => void;
}

function watchRoot(root: string, note: (file: string) => void): FSWatcher {
  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (typeof filename !== 'string' || filename.length === 0) return;
    const id = filename.split(path.sep).join('/');
    if (id.split('/').some(part => SKIP.has(part))) return;
    note(id);
  });
  watcher.unref();
  return watcher;
}
