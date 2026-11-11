import process from 'node:process';

import { describe, expect, it } from 'vite-plus/test';

import { MCP_MISSING, missingDevframe } from '#cli/mcp.ts';
import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

describe('mcp command', () => {
  it('rejects a fix flag and recognizes a missing package', () => {
    const io = captureIo(process.cwd());
    expect(run(['mcp', '--write'], io)).toBe(2);
    expect(io.errors()).toContain('--write is only for fix.');
    const error = new Error("Cannot find package 'devframe'");
    (error as { code?: string }).code = 'ERR_MODULE_NOT_FOUND';
    expect(missingDevframe(error)).toBe(true);
    expect(MCP_MISSING).toContain('not installed');
  });
});
