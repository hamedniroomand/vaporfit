import { existsSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { pathToFileURL, URL } from 'node:url';

import { chromium, type Browser } from 'playwright-core';

import type { ProbeRun } from './weekly-plan.ts';

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const failed: ProbeRun = { expected: 'breaks', observed: 'error' };

interface Served {
  port: number;
  close: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function serve(distDir: string): Promise<Served | null> {
  const root = path.resolve(distDir);
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const file = path.resolve(root, decodeURIComponent(url.pathname).replace(/^\/+/u, ''));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !existsSync(file)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const type = types[path.extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    response.end(readFileSync(file));
  });
  const served = await new Promise<Served | null>(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        resolve(null);
        return;
      }
      resolve({
        port: address.port,
        close: () => {
          server.close();
        },
      });
    });
  });
  return served;
}

async function readProbe(
  probeFile: string,
  page: {
    goto: (url: string) => Promise<unknown>;
    waitForTimeout: (ms: number) => Promise<unknown>;
  },
  port: number,
): Promise<ProbeRun> {
  const imported: unknown = await import(pathToFileURL(probeFile).href);
  if (!isRecord(imported)) return failed;
  const { expected, check } = imported;
  if (expected !== 'breaks' && expected !== 'works') return failed;
  if (typeof check !== 'function') return { expected, observed: 'error' };
  const call = check as (target: unknown, side: string) => Promise<unknown>;
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForTimeout(400);
  const vapor = await call(page, 'vapor');
  const vdom = await call(page, 'vdom');
  const same = JSON.stringify(vapor) === JSON.stringify(vdom);
  return { expected, observed: same ? 'works' : 'breaks' };
}

/** Opens Chrome through the same channel as repros/check.mjs. */
export async function launchChrome(): Promise<Browser> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  return browser;
}

/** Opens one built probe in Chrome. The pass rule is the same rule as repros/check.mjs. */
export async function observeProbe(
  browser: Browser,
  distDir: string,
  probeFile: string,
): Promise<ProbeRun> {
  if (!existsSync(path.join(distDir, 'index.html'))) return failed;
  const server = await serve(distDir);
  if (server === null) return failed;
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  try {
    return await readProbe(probeFile, page, server.port);
  } catch {
    return failed;
  } finally {
    await page.close();
    server.close();
  }
}
