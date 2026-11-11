import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { run } from '#cli/run.ts';
import { captureIo } from '#test/capture.ts';

const page = `<script setup>
</script>
<template>
  <p>{{ $route.path }}</p>
  <button @click="$router.push('/')">Go</button>
</template>
`;

const routeOnly = `<script setup>
</script>
<template>
  <p>{{ $route.path }}</p>
</template>
`;

const conflict = `<script setup>
const route = { path: '/' }
</script>
<template>
  <p>{{ $route.path }}</p>
</template>
`;

const loop = `<script setup>
</script>
<template>
  <p v-for="route in ['/']">{{ $route.path }}</p>
</template>
`;

const statement = `<script setup>
</script>
<template>
  <p>{{ $route.path }}</p>
  <button @click="$router.push('/');">Go</button>
</template>
`;

const otherName = `<script setup>
</script>
<i18n lang="json">
{ "en": { "hello": "Hello" } }
</i18n>
<template>
  <p v-for="t in ['a']">{{ $route.path }} {{ t }}</p>
</template>
`;

const main = `import { createApp, vaporInteropPlugin } from 'vue';
import App from './Page.vue';
createApp(App).use(vaporInteropPlugin).mount('#app');
`;

function writeProject(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-router-'));
  const all: Record<string, string> = {
    'index.html':
      '<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n',
    'package.json': '{ "name": "vaporfit-cli-router", "private": true }\n',
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

function read(root: string, file: string): string {
  return readFileSync(path.join(root, file), 'utf8');
}

describe('fix --router', () => {
  it('changes $route and $router to useRoute and useRouter', () => {
    const root = writeProject({ 'src/Page.vue': page });
    const io = captureIo(root);
    expect(run(['fix', '--router', '--write'], io)).toBe(0);
    const next = read(root, 'src/Page.vue');
    expect(next).toContain(`import { useRoute, useRouter } from 'vue-router'`);
    expect(next).toContain('const route = useRoute()');
    expect(next).toContain('const router = useRouter()');
    expect(next).toContain('{{ route.path }}');
    expect(next).toContain('router.push');
    expect(next).not.toContain('$route');
    expect(next).not.toContain('$router');
  });

  it('prints a diff and does not write the file', () => {
    const root = writeProject({ 'src/Page.vue': routeOnly });
    const io = captureIo(root);
    expect(run(['fix', '--router'], io)).toBe(0);
    expect(read(root, 'src/Page.vue')).toBe(routeOnly);
    expect(io.output()).toContain('--- src/Page.vue');
    expect(io.output()).toContain(`+import { useRoute } from 'vue-router'`);
    expect(io.output()).not.toContain('useRouter');
  });

  it('keeps the file when the name route is not free', () => {
    const root = writeProject({ 'src/Page.vue': conflict });
    const io = captureIo(root);
    expect(run(['fix', '--router', '--write'], io)).toBe(0);
    expect(read(root, 'src/Page.vue')).toBe(conflict);
    expect(io.output()).toContain('manual');
    expect(io.output()).toContain('The name route is not free.');
  });

  it('keeps the file when v-for binds the name route', () => {
    const root = writeProject({ 'src/Page.vue': loop });
    const io = captureIo(root);
    expect(run(['fix', '--router', '--write'], io)).toBe(0);
    expect(read(root, 'src/Page.vue')).toBe(loop);
    expect(io.output()).toContain('The name route is not free.');
  });
});

describe('fix --router unreadable expression', () => {
  it('keeps the file when a click handler is a statement', () => {
    const root = writeProject({ 'src/Page.vue': statement });
    const io = captureIo(root);
    expect(run(['fix', '--router', '--write'], io)).toBe(0);
    expect(read(root, 'src/Page.vue')).toBe(statement);
    expect(io.output()).toContain('manual');
    expect(io.output()).toContain('cannot read an expression');
  });
});

describe('fix --router with other blocks', () => {
  it('changes $route when the file has an i18n block and a v-for name t', () => {
    const root = writeProject({ 'src/Page.vue': otherName });
    const io = captureIo(root);
    expect(run(['fix', '--router', '--write'], io)).toBe(0);
    const next = read(root, 'src/Page.vue');
    expect(next).toContain('const route = useRoute()');
    expect(next).toContain('v-for="t in [\'a\']"');
    expect(next).toContain('<i18n');
    expect(next).not.toContain('$route');
  });
});
