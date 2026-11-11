import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { loadCompiler } from '#compiler/vue-compiler.ts';
import { vaporChangeRejected } from '#fix/codemod.ts';

const target = { filename: 'src/Hello.vue', id: 'src/Hello.vue' };

describe('Vapor compile check', () => {
  it('rejects a new file when the Vapor compiler reports a new error', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-compile-'));
    writeFileSync(
      path.join(root, 'package.json'),
      '{ "name": "vaporfit-compile", "private": true }\n',
    );
    const compiler = loadCompiler(root);
    const before = `<script setup>
</script>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;
    const after = `<script setup>
const { t } = (
</script>
<template>
  <p>{{ t('hello') }}</p>
</template>
`;
    expect(vaporChangeRejected(compiler, target, { after, before })).toBe(true);
  });
});

describe('Vapor compile check accepts a valid file', () => {
  it('accepts a new file when the Vapor compiler reports no new error', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-compile-'));
    writeFileSync(
      path.join(root, 'package.json'),
      '{ "name": "vaporfit-compile", "private": true }\n',
    );
    const compiler = loadCompiler(root);
    const before = `<script setup>
</script>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;
    const after = `<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
<template>
  <p>{{ t('hello') }}</p>
</template>
`;
    expect(vaporChangeRejected(compiler, target, { after, before })).toBe(false);
  });
});
