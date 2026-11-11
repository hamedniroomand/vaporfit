import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

const hello = `<script setup>
</script>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;

function writeProject(main: string, files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-i18n-'));
  const all: Record<string, string> = {
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
    'package.json': '{ "name": "vaporfit-cli-i18n", "private": true }\n',
    'src/main.js': main,
    ...files,
  };
  for (const [file, source] of Object.entries(all)) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }
  return root;
}

const composition = `import { createApp, vaporInteropPlugin } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './Hello.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en: { hello: 'Hello' } },
});

createApp(App).use(vaporInteropPlugin).use(i18n).mount('#app');
`;

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

const conflict = `<script setup>
const t = 'x'
</script>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;

const block = `<script setup>
</script>
<i18n lang="json">
{ "en": { "hello": "Hello" } }
</i18n>
<template>
  <p>{{ $t('hello') }}</p>
</template>
`;

const loop = `<script setup>
</script>
<template>
  <p v-for="t in ['a']">{{ $t(t) }}</p>
</template>
`;

const slot = `<script setup>
</script>
<template>
  <Comp v-slot="{ t }">
    <p>{{ $t('hello') }}</p>
  </Comp>
</template>
`;

const translate = `<script setup>
</script>
<template>
  <p>{{ $t('hello') }} {{ $te('hello') }} {{ $rt('hello') }} {{ $i18n.locale }}</p>
</template>
`;

function mainWith(body: string): string {
  return `import { createApp, vaporInteropPlugin } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './Hello.vue';
${body}
createApp(App).use(vaporInteropPlugin).use(i18n).mount('#app');
`;
}

describe('fix --i18n', () => {
  it('changes $t to useI18n when the tool can see legacy: false', () => {
    const root = writeProject(composition, { 'src/Hello.vue': hello });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    const next = read(root, 'src/Hello.vue');
    expect(next).toContain(`import { useI18n } from 'vue-i18n'`);
    expect(next).toContain('const { t } = useI18n()');
    expect(next).toContain("{{ t('hello') }}");
    expect(next).not.toContain('$t');
  });

  it('prints a diff and does not write the file', () => {
    const root = writeProject(composition, { 'src/Hello.vue': hello });
    const io = captureIo(root);
    expect(run(['fix', '--i18n'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
    expect(io.output()).toContain('--- src/Hello.vue');
    expect(io.output()).toContain('+++ src/Hello.vue');
    expect(io.output()).toContain(`+import { useI18n } from 'vue-i18n'`);
    expect(io.output()).toContain('does not write');
    expect(io.output()).toContain('Add --write');
  });

  it('does not write when the plugin is not installed', () => {
    const root = writeProject(composition.replace('.use(vaporInteropPlugin)', ''), {
      'src/Hello.vue': hello,
    });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
    expect(io.output()).toContain('does not write');
  });

  it('does not change $t without --i18n', () => {
    const root = writeProject(composition, { 'src/Hello.vue': hello });
    const io = captureIo(root);
    expect(run(['fix', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
  });
});

describe('fix --i18n manual names', () => {
  it('keeps the file when the name t is not free', () => {
    const root = writeProject(composition, { 'src/Hello.vue': conflict });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(conflict);
    expect(io.output()).toContain('manual');
    expect(io.output()).toContain('The name t is not free.');
  });

  it('keeps the file when the file has an i18n block', () => {
    const root = writeProject(composition, { 'src/Hello.vue': block });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(block);
    expect(io.output()).toContain('manual');
    expect(io.output()).toContain('i18n block');
  });

  it('keeps the file when v-for binds the name t', () => {
    const root = writeProject(composition, { 'src/Hello.vue': loop });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(loop);
    expect(io.output()).toContain('manual');
    expect(io.output()).toContain('The name t is not free.');
  });

  it('keeps the file when a slot prop uses the name t', () => {
    const root = writeProject(composition, { 'src/Hello.vue': slot });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(slot);
    expect(io.output()).toContain('The name t is not free.');
  });
});

describe('fix --i18n globals', () => {
  it('changes $t and $te and does not change $rt or $i18n', () => {
    const root = writeProject(composition, { 'src/Hello.vue': translate });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    const next = read(root, 'src/Hello.vue');
    expect(next).toContain('const { t, te } = useI18n()');
    expect(next).toContain("t('hello')");
    expect(next).toContain("te('hello')");
    expect(next).toContain("$rt('hello')");
    expect(next).toContain('$i18n.locale');
    expect(next).not.toContain('$t(');
    expect(next).not.toContain('$te(');
  });

  it('keeps every file manual when legacy is missing', () => {
    const root = writeProject(
      mainWith(`const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello' } },
});`),
      { 'src/Hello.vue': hello },
    );
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
    expect(io.output()).toContain('The tool cannot see legacy: false.');
  });

  it('keeps every file manual when legacy is true', () => {
    const root = writeProject(composition.replace('legacy: false', 'legacy: true'), {
      'src/Hello.vue': hello,
    });
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
    expect(io.output()).toContain('manual');
  });
});

describe('fix --i18n legacy readings', () => {
  it('reads legacy: false from a local object when that property is last', () => {
    const root = writeProject(
      mainWith(`const extra = { locale: 'en' };
const i18n = createI18n({
  ...extra,
  legacy: false,
});`),
      { 'src/Hello.vue': hello },
    );
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toContain('useI18n');
  });

  it('keeps the file manual when a spread follows legacy: false', () => {
    const root = writeProject(
      mainWith(`const extra = {};
const i18n = createI18n({
  legacy: false,
  ...extra,
});`),
      { 'src/Hello.vue': hello },
    );
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toBe(hello);
    expect(io.output()).toContain('The tool cannot see legacy: false.');
  });

  it('changes the file when Nuxt sets i18n.legacy to false', () => {
    const root = writeProject(
      `import { createApp } from 'vue';
import App from './Hello.vue';
createApp(App).mount('#app');
`,
      {
        'nuxt.config.ts': `export default defineNuxtConfig({
  vue: { vapor: true },
  i18n: { legacy: false },
});
`,
        'src/Hello.vue': hello,
      },
    );
    const io = captureIo(root);
    expect(run(['fix', '--i18n', '--write'], io)).toBe(0);
    expect(read(root, 'src/Hello.vue')).toContain('const { t } = useI18n()');
  });
});
