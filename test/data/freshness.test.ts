import { describe, expect, it } from 'vite-plus/test';

import { buildDate, isStale } from '#data/freshness.ts';

describe('isStale', () => {
  it('is stale when the verified date is more than 30 days before today', () => {
    expect(isStale('2026-10-10', '2026-11-10')).toBe(true);
    expect(isStale('2026-11-10', '2026-12-11')).toBe(true);
  });

  it('is not stale when the verified date is 30 days before today', () => {
    expect(isStale('2026-10-11', '2026-11-10')).toBe(false);
    expect(isStale('2026-11-10', '2026-12-10')).toBe(false);
  });

  it('is not stale on the verified date or when the verified date is later', () => {
    expect(isStale('2026-11-10', '2026-11-10')).toBe(false);
    expect(isStale('2026-11-10', '2026-11-09')).toBe(false);
  });
});

describe('buildDate', () => {
  it('uses the UTC calendar date of the clock', () => {
    expect(buildDate(new Date('2026-11-09T23:42:00.000Z'))).toBe('2026-11-09');
    expect(buildDate(new Date('2026-11-10T00:30:00.000Z'))).toBe('2026-11-10');
  });
});
