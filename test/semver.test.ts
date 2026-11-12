import { describe, expect, it } from 'vite-plus/test';

import { compareVersions } from '#semver.ts';

describe('prerelease order', () => {
  it('puts a numeric id before a word id', () => {
    expect(compareVersions('1.0.0-1', '1.0.0-alpha')).toBe(-1);
    expect(compareVersions('1.0.0-alpha', '1.0.0-1')).toBe(1);
  });

  it('orders two word ids by text', () => {
    expect(compareVersions('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
    expect(compareVersions('1.0.0-beta', '1.0.0-alpha')).toBe(1);
  });
});
