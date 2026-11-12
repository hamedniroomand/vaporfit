import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type {
  CoreModule,
  Descriptor,
  SfcModule,
  SharedModule,
  SourcePoint,
  TextDiagnostic,
  VaporModule,
} from './vue-compiler.ts';

/** File access for `compileScript`. Without it, a props type from another file is a compile error. */
export interface TypeFiles {
  fileExists: (file: string) => boolean;
  readFile: (file: string) => string | undefined;
}

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

// The compiler tries `./types` before `./types/index.ts`, so a folder must not count as a file.
// A stat error other than "not found" stops the compile and shows as a compile error.
function isFile(file: string): boolean {
  return statSync(file, { throwIfNoEntry: false })?.isFile() === true;
}

/** Compiles the script blocks. A compiler error becomes a diagnostic at the script block. */
export function scriptResult(
  sfc: SfcModule,
  descriptor: Descriptor,
  id: string,
  vapor: boolean,
): { bindings?: Record<string, string>; errors: TextDiagnostic[] } {
  if (!descriptor.script && !descriptor.scriptSetup) return { errors: [] };
  const read = new Set<string>();
  const fs: TypeFiles = {
    fileExists: isFile,
    readFile: file => {
      read.add(file);
      return isFile(file) ? readFileSync(file, 'utf8') : undefined;
    },
  };
  try {
    const result = sfc.compileScript(descriptor, { fs, id, inlineTemplate: false, vapor });
    return { bindings: result.bindings, errors: [] };
  } catch (error) {
    const block = descriptor.scriptSetup ?? descriptor.script;
    const message = error instanceof Error ? error.message : 'The compiler failed.';
    return {
      errors: [
        {
          column: block?.loc.start.column ?? 1,
          line: block?.loc.start.line ?? 1,
          message,
        },
      ],
    };
  } finally {
    // Vue keeps each type file in a cache for the process. The next run must read the file again.
    for (const file of read) sfc.invalidateTypeCache?.(file);
  }
}
