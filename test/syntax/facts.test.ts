import { describe, expect, it } from 'vite-plus/test';

import { expressionRefAccess } from '#syntax/access.ts';
import { forBindings, freeIdentifiers, patternNames } from '#syntax/ast.ts';
import { resolveBinding } from '#syntax/binding.ts';
import { resolveCallee } from '#syntax/calls.ts';
import { frameLocation } from '#syntax/position.ts';
import { readScript, topLevelAwait } from '#syntax/script.ts';

describe('script facts', () => {
  it('follows an alias to the imported name', () => {
    const facts = readScript(
      "import { getCurrentInstance } from 'vue';\nconst current = getCurrentInstance;\n",
      0,
    );

    expect(resolveCallee('current', facts)).toEqual({
      imported: 'getCurrentInstance',
      source: 'vue',
    });
  });

  it('does not read a member of a value import as an import', () => {
    const facts = readScript("import { foo } from 'pkg';\nconst bar = foo.baz;\n", 0);

    expect(resolveBinding('bar', facts).kind).toBe('unreadable');
  });

  it('reads an exported function and defineAsyncComponent', () => {
    const facts = readScript(
      `import { defineAsyncComponent } from 'vue';
export function named() {
  return 1;
}
export default function fallback() {
  return 2;
}
const Async = defineAsyncComponent(() => Promise.resolve({}));
`,
      0,
    );

    expect(facts.locals.get('named')?.kind).toBe('function');
    expect(facts.locals.get('fallback')?.kind).toBe('function');
    expect(facts.locals.get('Async')?.kind).toBe('function');
  });

  it('returns null for a script that the parser cannot read', () => {
    expect(topLevelAwait('???', 0)).toBeNull();
    expect(readScript('???', 0).locals.size).toBe(0);
  });
});

describe('expression facts', () => {
  it('ignores an instance prop that is not a template ref read', () => {
    expect(expressionRefAccess('box.$el', 'script')).toEqual([]);
    expect(expressionRefAccess('box.item.$el', 'script')).toEqual([]);
  });

  it('reads a pattern, a computed member, an object key, and a default parameter', () => {
    expect(patternNames('{ a = b, ...rest }')).toEqual(['a', 'rest']);
    expect(patternNames('[a, b]')).toEqual(['a', 'b']);
    expect(patternNames('...item')).toEqual(['item']);
    expect(forBindings('(item = 1) in list')?.names).toEqual(['item']);
    expect(freeIdentifiers('obj[name]', new Set()).map(item => item.name)).toEqual(['obj', 'name']);
    expect(freeIdentifiers('{ foo: bar }', new Set()).map(item => item.name)).toEqual(['bar']);
    expect(freeIdentifiers('(a = b) => a', new Set()).map(item => item.name)).toEqual(['b']);
  });

  it('returns null when a compiler frame has no caret', () => {
    expect(frameLocation('1 | const value\nno caret')).toBeNull();
  });
});
