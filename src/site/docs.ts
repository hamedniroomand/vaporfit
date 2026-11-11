import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { VaporfitError } from '#errors.ts';

import { fillBlock, libraryMarkdown, ruleMarkdown } from './markdown.ts';
import { libraryPage, ruleRows } from './table.ts';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

function fillPage(file: string, content: string): void {
  writeFileSync(file, fillBlock(readFileSync(file, 'utf8'), content));
}

/**
 * Entry point for scripts/docs-data.ts. Writes the library table and the rule table into the
 * docs pages. The site, the raw Markdown routes and llms-full.txt all read these pages.
 */
export function runDocsData(): void {
  const data = path.join(REPO_ROOT, 'data');
  fillPage(path.join(REPO_ROOT, 'docs/2.libraries.md'), libraryMarkdown(libraryPage(data)));
  fillPage(path.join(REPO_ROOT, 'docs/3.rules.md'), ruleMarkdown(ruleRows(data)));
}

export function canonicalAddresses(output: string): string[] {
  const addresses: string[] = [];
  for (const file of readdirSync(output, { recursive: true, encoding: 'utf8' })) {
    if (path.basename(file) !== 'index.html') continue;
    const html = readFileSync(path.join(output, file), 'utf8');
    const address = /<link rel="canonical" href="([^"]+)">/u.exec(html)?.[1];
    if (address !== undefined) addresses.push(address);
  }
  return addresses.toSorted();
}

export function sitemapXml(addresses: readonly string[]): string {
  const lines = addresses.map(address => `  <url><loc>${address}</loc></url>`);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...lines,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Entry point for scripts/docs-sitemap.ts. Writes docs/public/sitemap.xml after a build.
 * Each address comes from the canonical link of a page that the build made.
 *
 * The built server serves only the public files that were there before the build. Thus the
 * sitemap is a tracked file, and this run fails when the build used an old one.
 */
export function runDocsSitemap(): void {
  // Reads only docs/.output/public. Change the folder when the host uses a different Nitro preset.
  const output = path.join(REPO_ROOT, 'docs/.output/public');
  const addresses = canonicalAddresses(output);
  if (addresses.length === 0) {
    throw new VaporfitError(`${output}: no page has a canonical link`);
  }
  const sitemap = sitemapXml(addresses);
  const builtFile = path.join(output, 'sitemap.xml');
  const built = existsSync(builtFile) ? readFileSync(builtFile, 'utf8') : '';
  writeFileSync(path.join(REPO_ROOT, 'docs/public/sitemap.xml'), sitemap);
  if (built !== sitemap) {
    throw new VaporfitError(
      'The page list changed. docs/public/sitemap.xml is new. Run the build again.',
    );
  }
}

/**
 * Entry point for scripts/docs-dev.ts. Writes the tables, then starts the undocs dev server.
 *
 * On an interrupt, undocs waits until each browser tab closes its connection. Thus this
 * function stops the server by force. The dev server has no data to save.
 */
export function runDocsDev(): void {
  runDocsData();
  const docs = path.join(REPO_ROOT, 'docs');
  const cli = path.join(docs, 'node_modules/undocs/cli/main.mjs');
  const server = spawn(process.execPath, [cli, 'dev', docs], { stdio: 'inherit' });
  const stop = (): void => {
    server.kill('SIGKILL');
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  server.once('exit', code => {
    process.exitCode = code ?? 0;
  });
}
