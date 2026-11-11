import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { fillBlock, libraryMarkdown, ruleMarkdown } from './markdown.ts';
import { libraryPage, ruleRows } from './table.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function fillPage(file: string, content: string): void {
  writeFileSync(file, fillBlock(readFileSync(file, 'utf8'), content));
}

/**
 * Entry point for scripts/docs-data.ts. Writes the library table and the rule table into the
 * docs pages. The site, the Markdown file of each page and llms-full.txt all read these pages.
 */
export function runDocsData(): void {
  const data = path.join(REPO_ROOT, 'data');
  fillPage(path.join(REPO_ROOT, 'docs/2.libraries.md'), libraryMarkdown(libraryPage(data)));
  fillPage(path.join(REPO_ROOT, 'docs/3.rules.md'), ruleMarkdown(ruleRows(data)));
}
