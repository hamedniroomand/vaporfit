import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadCompiler } from '#compiler/vue-compiler.ts';
import type { TemplateNode } from '#compiler/vue-compiler.ts';
import { mergeFacts, readScript } from '#syntax/script.ts';
import { expressionOf, inspectTemplate } from '#syntax/template.ts';
import type { TemplateFacts } from '#syntax/template.ts';

function inspect(source: string): TemplateFacts {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-syntax-'));
  mkdirSync(root, { recursive: true });
  writeFileSync(
    path.join(root, 'package.json'),
    '{ "name": "vaporfit-syntax", "private": true }\n',
  );
  const compiler = loadCompiler(root);
  const compiled = compiler.compile(source, 'App.vue', 'App');
  const facts = mergeFacts(
    [compiled.script, compiled.setup]
      .filter(block => block !== null)
      .map(block => readScript(block.content, block.offset)),
  );
  return inspectTemplate(compiled, facts, compiler, 'App.vue');
}

describe('template facts', () => {
  it('reads a member tag that is not a namespace as unreadable', () => {
    const facts = inspect(`<script setup>
import { Foo } from 'pkg';
</script>
<template><Foo.Bar /></template>
`);

    expect(facts.components.find(item => item.tag === 'Foo.Bar')?.resolved.kind).toBe('unreadable');
  });

  it('reads a dynamic argument and a quoted ref', () => {
    const facts = inspect(`<script setup>
const name = 'title';
</script>
<template>
  <Widget v-ref="'box'" v-bind:[name]="1" />
</template>
`);
    const widget = facts.components.find(item => item.tag === 'Widget');

    expect(widget?.ref).toBe('box');
    expect(facts.names.some(item => item.name === 'name')).toBe(true);
  });

  it('reads an expression that the compiler stores as an object', () => {
    const node = {
      exp: { content: { content: 1 } },
    } as unknown as TemplateNode;

    expect(expressionOf(node)).toBeNull();
  });
});
