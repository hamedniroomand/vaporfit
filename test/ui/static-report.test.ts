import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { URL } from 'node:url';

import { chromium, type Page } from 'playwright-core';
import { build } from 'vite';
import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { analyze } from '#index.ts';
import { captureIo } from '#test/capture.ts';

const repo = path.join(import.meta.dirname, '../..');
const shadcn = path.join(repo, 'test/fixtures/shadcn');
const pluginError = path.join(repo, 'test/fixtures/plugin-error');

describe('static report', () => {
  it('serves the shadcn summary over HTTP', async () => {
    await build({ configFile: path.join(repo, 'ui/vite.config.ts'), logLevel: 'error' });
    const out = path.join(repo, 'dist/static-report-test');
    const io = captureIo(repo);
    const code = await run(['report', '--root', shadcn, '--out', out], io);
    expect(code).toBe(0);
    const blocked = captureIo(repo);
    const errorCode = await run(
      ['report', '--root', pluginError, '--out', path.join(out, 'error')],
      blocked,
    );
    expect(errorCode).toBe(0);
    const report = analyze(shadcn);
    const site = await serve(out);
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      channel: 'chrome',
    });
    try {
      const page = await browser.newPage({ viewport: { height: 800, width: 390 } });
      await readSummary(page, site.url, report);
      await readDetail(page, site.url, report);
      await readComponents(page, site.url, report);
      await readLayout(page);
    } finally {
      await browser.close();
      await site.close();
    }
  }, 180000);
});

async function readSummary(
  page: Page,
  url: string,
  report: ReturnType<typeof analyze>,
): Promise<void> {
  await page.goto(url);
  await page.locator('[data-count="components"]').waitFor();
  expect(await text(page, 'components')).toBe(String(report.summary.components));
  expect(await text(page, 'ready')).toBe(String(report.summary.interop.ready));
  expect(await text(page, 'blocked')).toBe(String(report.summary.interop.blocked));
  expect(await text(page, 'unknown')).toBe(String(report.summary.interop.unknown));
  expect(await text(page, 'pure-ready')).toBe(String(report.summary.pure.ready));
  expect(await text(page, 'pure-blocked')).toBe(String(report.summary.pure.blocked));
  expect(await text(page, 'pure-unknown')).toBe(String(report.summary.pure.unknown));
  await expectSentence(page);
}

async function readDetail(
  page: Page,
  url: string,
  report: ReturnType<typeof analyze>,
): Promise<void> {
  const component = report.components.find(item => item.findings.length > 0);
  expect(component).toBeDefined();
  await page.goto(`${url}#/component/${encodeURIComponent(component?.id ?? '')}`);
  const rule = component?.findings[0]?.rule ?? '';
  await page.locator('h3').filter({ hasText: rule }).first().waitFor();
  await expectSentence(page);
}

async function readComponents(
  page: Page,
  url: string,
  report: ReturnType<typeof analyze>,
): Promise<void> {
  const rows = page.locator('.table-row');
  await page.goto(`${url}#/components`);
  await rows.first().waitFor();
  expect(await rows.count()).toBe(report.components.length);
  // Blocked comes first.
  expect(await rows.first().getAttribute('href')).toContain(
    encodeURIComponent('src/pages/Home.vue'),
  );

  await page.getByRole('searchbox').fill('dialog');
  await page.waitForFunction(() => globalThis.location.hash.includes('q=dialog'));
  expect(await rows.count()).toBe(1);

  await page.goto(`${url}#/rankings`);
  await page.locator('.rank-row', { hasText: 'reka-ui/as-child' }).first().click();
  await page.locator('.filter-note', { hasText: 'reka-ui/as-child' }).waitFor();
  const withRule = report.components.filter(item =>
    item.findings.some(entry => entry.rule === 'reka-ui/as-child'),
  );
  expect(await rows.count()).toBe(withRule.length);

  await page.goto(`${url}#/component/${encodeURIComponent('src/pages/Home.vue')}`);
  const probe = page.locator('.evidence a', { hasText: 'repros/reka-ui-as-child' }).first();
  expect(await probe.getAttribute('href')).toBe(
    'https://github.com/hamedniroomand/vaporfit/tree/main/repros/reka-ui-as-child',
  );
}

async function readLayout(page: Page): Promise<void> {
  const wide = await page.evaluate(() => {
    const node = (
      globalThis as unknown as {
        document: { documentElement: { scrollWidth: number; clientWidth: number } };
      }
    ).document.documentElement;
    return node.scrollWidth <= node.clientWidth + 1;
  });
  expect(wide).toBe(true);
  await page.locator('button', { hasText: 'Theme' }).click();
  const theme = await page.evaluate(
    () =>
      (
        globalThis as unknown as {
          document: { documentElement: { dataset: { theme?: string } } };
        }
      ).document.documentElement.dataset.theme,
  );
  expect(theme).toBe('dark');
}

async function text(page: Page, name: string): Promise<string> {
  return (await page.locator(`[data-count="${name}"]`).innerText()).trim();
}

async function expectSentence(page: Page): Promise<void> {
  await page.getByText('It does not test behavior.').waitFor();
}

function serve(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname);
    const file = path.join(root, relative === '/' ? 'index.html' : relative);
    try {
      const body = readFileSync(file);
      response.writeHead(200, { 'content-type': contentType(file) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('missing');
    }
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () => closeServer(server),
      });
    });
  });
}

function contentType(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}
