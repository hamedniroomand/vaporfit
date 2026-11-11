import { describe, expect, it } from 'vite-plus/test';

import { findingId } from '#report/finding-id.ts';
import type { Finding } from '#report/types.ts';

function finding(change: Partial<Finding> = {}): Finding {
  return {
    evidence: ['compiler'],
    failure: 'silent',
    level: 'error',
    location: { column: 4, file: 'src/App.vue', line: 2 },
    message: 'An object directive is skipped in a Vapor template.',
    rule: 'vapor/object-directive',
    ...change,
  };
}

describe('finding ids', () => {
  it('stays the same when the message changes', () => {
    const id = findingId(finding());
    expect(id).toBe(findingId(finding({ message: 'other words' })));
    expect(id).toMatch(/^vf_[0-9a-f]{10}$/u);
  });

  it('changes when the file, the line, the column, or the rule changes', () => {
    const id = findingId(finding());
    expect(id).not.toBe(
      findingId(finding({ location: { column: 4, file: 'src/Other.vue', line: 2 } })),
    );
    expect(id).not.toBe(
      findingId(finding({ location: { column: 4, file: 'src/App.vue', line: 9 } })),
    );
    expect(id).not.toBe(
      findingId(finding({ location: { column: 8, file: 'src/App.vue', line: 2 } })),
    );
    expect(id).not.toBe(findingId(finding({ rule: 'vapor/v-memo' })));
  });
});
