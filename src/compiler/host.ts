import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type {
  CoreModule,
  SfcModule,
  SharedModule,
  SourcePoint,
  TextDiagnostic,
  VaporModule,
} from './vue-compiler.ts';

export function diagnosticText(error: unknown): TextDiagnostic {
  if (typeof error === 'string') return { column: 1, line: 1, message: error };
  if (error instanceof Error) return located(error.message, error);
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return located(String(error.message), error);
  }
  return { column: 1, line: 1, message: 'The compiler reported an error.' };
}

export function probeOptionsMessage(sfc: SfcModule): string {
  const source = '<script>\nexport default {}\n</script>\n';
  try {
    const parsed = sfc.parse(source, { filename: 'vaporfit-probe.vue' });
    sfc.compileScript(parsed.descriptor, {
      id: 'vaporfit-probe',
      inlineTemplate: false,
      vapor: true,
    });
  } catch (error) {
    return error instanceof Error ? error.message : '';
  }
  return '';
}

export function readVueVersion(root: string): string | null {
  try {
    const require = createRequire(path.join(root, 'package.json'));
    const packagePath = require.resolve('vue/package.json');
    const json = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: unknown };
    return typeof json.version === 'string' ? json.version : null;
  } catch {
    return null;
  }
}

export function loadProjectModules(root: string): {
  sfc: SfcModule;
  vapor: VaporModule;
  shared: SharedModule;
  core: CoreModule;
} | null {
  try {
    const require = createRequire(path.join(root, 'package.json'));
    const vuePackage = require.resolve('vue/package.json');
    const fromVue = createRequire(vuePackage);
    return {
      core: fromVue('@vue/compiler-core') as CoreModule,
      sfc: fromVue('vue/compiler-sfc') as SfcModule,
      shared: fromVue('@vue/shared') as SharedModule,
      vapor: fromVue('@vue/compiler-vapor') as VaporModule,
    };
  } catch {
    return null;
  }
}

export function loadToolShared(): SharedModule {
  const require = createRequire(import.meta.filename);
  return require('@vue/shared') as SharedModule;
}

export function packageVersion(name: string): string {
  const require = createRequire(import.meta.filename);
  const packagePath = require.resolve(`${name}/package.json`);
  const json = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: unknown };
  return typeof json.version === 'string' ? json.version : '0.0.0';
}

function located(message: string, error: object): TextDiagnostic {
  const loc = (error as { loc?: { start?: SourcePoint } }).loc?.start;
  return { column: loc?.column ?? 1, line: loc?.line ?? 1, message };
}
