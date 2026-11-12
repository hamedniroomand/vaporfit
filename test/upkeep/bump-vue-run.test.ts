import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { Mock } from 'vite-plus/test';

import manifest from '#pkg' with { type: 'json' };
import { bumpReport, runBumpVue } from '#upkeep/bump-vue.ts';

const current = manifest.dependencies['@vue/compiler-sfc'];

interface NpmAnswer {
  ok: boolean;
  status: number;
}

/** A stub for fetch. The command reads only `ok` and `status`. */
function npmAnswer(status: number): Mock<(url: string) => Promise<NpmAnswer>> {
  return vi
    .fn<(url: string) => Promise<NpmAnswer>>()
    .mockResolvedValue({ ok: status < 300, status });
}

/** Runs the command with these arguments. Returns stderr. The command must stop before it changes a file. */
async function runWith(args: string[]): Promise<string> {
  const argv = process.argv;
  let stderr = '';
  process.argv = [argv[0] ?? 'node', 'bump-vue.ts', ...args];
  const write = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => {
    stderr += String(chunk);
    return true;
  });
  try {
    await runBumpVue();
  } finally {
    process.argv = argv;
    write.mockRestore();
  }
  return stderr;
}

afterEach(() => {
  vi.unstubAllGlobals();
  process.exitCode = undefined;
});

describe('runBumpVue', () => {
  it('shows the usage when the version is missing', async () => {
    expect(await runWith([])).toContain('Usage: vp run bump-vue <version>');
    expect(process.exitCode).toBe(1);
  });

  it('refuses the version that the tool pins now', async () => {
    expect(await runWith([current])).toBe(`vaporfit already pins Vue ${current}\n`);
    expect(process.exitCode).toBe(1);
  });

  it('stops before a change when npm does not have the version', async () => {
    const fetch = npmAnswer(404);
    vi.stubGlobal('fetch', fetch);
    expect(await runWith(['3.99.0'])).toBe('vue 3.99.0 is not on npm\n');
    expect(fetch).toHaveBeenCalledWith('https://registry.npmjs.org/vue/3.99.0');
    expect(process.exitCode).toBe(1);
  });

  it('shows a registry error that is not 404', async () => {
    vi.stubGlobal('fetch', npmAnswer(503));
    expect(await runWith(['3.99.0'])).toBe('npm returned 503 for vue 3.99.0\n');
  });
});

describe('bumpReport', () => {
  it('lists the counts, the skipped probes and the next steps', () => {
    const text = bumpReport({
      changed: ['package.json', 'repros/a/package.json'],
      from: '3.6.0-rc.14',
      probes: ['repros/a'],
      skipped: ['repros/b (vue 3.6.0-rc.10)'],
      to: '3.6.0-rc.15',
    });
    expect(text).toContain(
      'Vue 3.6.0-rc.14 -> 3.6.0-rc.15\nChanged 2 files and 1 probe lockfiles.\n',
    );
    expect(text).toContain(
      'Probes with a different Vue pin (not changed):\n- repros/b (vue 3.6.0-rc.10)\n',
    );
    expect(text).toContain('This command does not change data/.');
    expect(bumpReport({ changed: [], from: 'a', probes: [], skipped: [], to: 'b' })).not.toContain(
      'different Vue pin',
    );
  });
});
