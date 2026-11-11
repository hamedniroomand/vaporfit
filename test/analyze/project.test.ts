import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vite-plus/test';

import { analyze, getComponent } from '#index.ts';

const fixtures = path.join(import.meta.dirname, '../fixtures');

function installPackage(root: string, name: string, body: Record<string, unknown>): void {
  const directory = path.join(root, 'node_modules', ...name.split('/'));
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name, ...body }));
}

describe('project facts', () => {
  it('reads coverage from installed package.json files', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-coverage-'));
    cpSync(path.join(fixtures, 'library-coverage'), root, { recursive: true });
    installPackage(root, 'element-plus', { version: '2.14.8' });
    installPackage(root, 'plain-vue', { peerDependencies: { vue: '^3.5.0' }, version: '1.0.0' });
    installPackage(root, '@vitejs/plugin-vue', {
      dependencies: { vue: '^3.5.0' },
      version: '6.0.10',
    });
    installPackage(root, 'vue', { version: '3.5.0' });
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    writeFileSync(path.join(root, 'dist/Skip.vue'), '<script>\nexport default {}\n</script>\n');
    const report = analyze(root);
    expect(report.project.coverage).toEqual({
      stale: [],
      withData: ['element-plus'],
      withoutData: ['@vitejs/plugin-vue', 'plain-vue'],
    });
    expect(report.project.vue).toBe('3.5.0');
    expect(report.project.compiler.source).toBe('tool');
    expect(getComponent(report, 'dist/Skip.vue')).toBeUndefined();
    expect(getComponent(report, 'src/Plain.vue')?.interop).toBe('ready');
  });

  it('counts a library with data that is not installed and reads a package.json that exports hide', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-coverage-'));
    cpSync(path.join(fixtures, 'library-coverage'), root, { recursive: true });
    installPackage(root, 'plain-vue', {
      exports: { '.': './index.js' },
      peerDependencies: { vue: '^3.5.0' },
      version: '1.0.0',
    });
    const report = analyze(root);
    expect(report.project.coverage).toEqual({
      stale: [],
      withData: ['element-plus'],
      withoutData: ['plain-vue'],
    });
  });
});

describe('entry detection', () => {
  it('reports the three plugin states', () => {
    const installed = analyze(path.join(fixtures, 'plugin-installed'));
    expect(installed.project.interopPlugin.state).toBe('installed');
    expect(installed.project.interopPlugin.level).toBeNull();
    expect(installed.project.interopPlugin.location?.file).toBe('src/main.js');
    expect(getComponent(installed, 'src/App.vue')?.vapor).toBe(true);
    expect(getComponent(installed, 'src/App.vue')?.interop).toBe('ready');
    expect(analyze(path.join(fixtures, 'plugin-alias')).project.interopPlugin.state).toBe(
      'installed',
    );
    expect(analyze(path.join(fixtures, 'plugin-namespace')).project.interopPlugin.state).toBe(
      'installed',
    );
    const note = analyze(path.join(fixtures, 'plugin-note'));
    expect(note.project.interopPlugin).toMatchObject({ level: 'note', state: 'not-installed' });
    const error = analyze(path.join(fixtures, 'plugin-error'));
    expect(error.project.interopPlugin).toMatchObject({ level: 'error', state: 'not-installed' });
    expect(getComponent(error, 'src/App.vue')?.interop).toBe('ready');
    expect(analyze(path.join(fixtures, 'plugin-dynamic')).project.interopPlugin.state).toBe(
      'undetermined',
    );
    expect(analyze(path.join(fixtures, 'plugin-many')).project.interopPlugin.location).toBeNull();
    expect(analyze(path.join(fixtures, 'plugin-none')).project.interopPlugin.state).toBe(
      'undetermined',
    );
  });

  it('reads a Nuxt config', () => {
    const enabled = analyze(path.join(fixtures, 'nuxt-on'));
    expect(enabled.project.interopPlugin.state).toBe('installed');
    expect(enabled.project.interopPlugin.level).toBeNull();
    expect(enabled.project.interopPlugin.location?.file).toBe('nuxt.config.ts');
    const off = analyze(path.join(fixtures, 'nuxt-off'));
    expect(off.project.interopPlugin).toMatchObject({ level: 'note', state: 'not-installed' });
    const missing = analyze(path.join(fixtures, 'nuxt-missing'));
    expect(missing.project.interopPlugin).toMatchObject({ level: 'error', state: 'not-installed' });
    expect(analyze(path.join(fixtures, 'nuxt-spread')).project.interopPlugin.state).toBe(
      'undetermined',
    );
    expect(analyze(path.join(fixtures, 'nuxt-bad')).project.interopPlugin.state).toBe(
      'undetermined',
    );
    expect(analyze(path.join(fixtures, 'nuxt-two')).project.interopPlugin.state).toBe(
      'undetermined',
    );
  });
});

describe('entry detection edge cases', () => {
  it('cannot tell when the Nuxt vue object has a spread', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-nuxt-'));
    writeFileSync(
      path.join(root, 'nuxt.config.ts'),
      'const extra = {};\nexport default defineNuxtConfig({ vue: { vapor: true, ...extra } });\n',
    );
    expect(analyze(root).project.interopPlugin.state).toBe('undetermined');
  });

  it('cannot tell when the entry imports the plugin from a local module', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vaporfit-entry-'));
    mkdirSync(path.join(root, 'src'));
    writeFileSync(
      path.join(root, 'src/main.ts'),
      "import { createApp } from 'vue';\nimport { vaporInteropPlugin } from './plugins';\ncreateApp({}).use(vaporInteropPlugin).mount('#app');\n",
    );
    expect(analyze(root).project.interopPlugin.state).toBe('undetermined');
  });
});
