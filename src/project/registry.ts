import { existsSync } from 'node:fs';
import path from 'node:path';

import { parseSync } from 'oxc-parser';

import type { VueCompiler } from '#compiler/vue-compiler.ts';
import { asNode, childNodes, walkNodes } from '#syntax/ast.ts';
import type { SyntaxNode } from '#syntax/ast.ts';

import { readAppComponents } from './app-components.ts';
import { readText } from './files.ts';
import { packageNameOf } from './manifest.ts';
import { remember } from './targets.ts';
import type { TagTarget } from './targets.ts';

export interface Registries {
  /** `app.component(name, value)` calls. */
  app: Map<string, TagTarget>;
  /** `.nuxt/components.d.ts`. */
  nuxt: Map<string, TagTarget>;
  /** `components.d.ts` of unplugin-vue-components. */
  unplugin: Map<string, TagTarget>;
  /** Local files that the app registers with a name that the tool cannot read. */
  unreadable: Set<string>;
}

interface DeclarationEntry {
  exportName: string;
  name: string;
  specifier: string;
}

export function readRegistries(root: string, compiler: VueCompiler): Registries {
  const unreadable = new Set<string>();
  return {
    app: readAppComponents(root, compiler, unreadable),
    nuxt: readDeclaration(path.join(root, '.nuxt/components.d.ts'), compiler),
    unplugin: readDeclaration(path.join(root, 'components.d.ts'), compiler),
    unreadable,
  };
}

export function lookupTag(
  tag: string,
  registries: Registries,
  compiler: VueCompiler,
): TagTarget | null {
  const names = [tag, compiler.capitalize(compiler.camelize(tag))];
  for (const map of [registries.unplugin, registries.nuxt, registries.app]) {
    for (const name of names) {
      const found = map.get(name);
      if (found !== undefined) return found;
    }
  }
  return null;
}

function readDeclaration(file: string, compiler: VueCompiler): Map<string, TagTarget> {
  const map = new Map<string, TagTarget>();
  const source = readText(file);
  if (source === null) return map;
  let program: SyntaxNode | null;
  try {
    program = asNode(parseSync(file, source, { lang: 'ts', sourceType: 'module' }).program);
  } catch {
    return map;
  }
  if (program === null) return map;
  const entries: DeclarationEntry[] = [];
  collectEntries(program, entries);
  for (const entry of entries) {
    const target = targetFromSpecifier(entry, file);
    if (target !== null) remember(map, entry.name, target, compiler);
  }
  return map;
}

/** Each `Name: typeof import('source')['export']` line of a components declaration file. */
function collectEntries(node: SyntaxNode, entries: DeclarationEntry[]): void {
  if (node.type === 'TSPropertySignature' || node.type === 'VariableDeclarator') {
    const name = signatureName(node);
    const spec = importSpec(node);
    if (name !== null && spec !== null) entries.push({ ...spec, name });
    return;
  }
  for (const child of childNodes(node)) collectEntries(child, entries);
}

function signatureName(node: SyntaxNode): string | null {
  const key = node.type === 'TSPropertySignature' ? node.key : node.id;
  if (key === undefined || key === null) return null;
  if (typeof key.name === 'string' && key.name.length > 0) return key.name;
  if (typeof key.value === 'string' && key.value.length > 0) return key.value;
  return null;
}

function importSpec(node: SyntaxNode): { exportName: string; specifier: string } | null {
  const found = { exportName: 'default', specifier: '' };
  walkNodes(node, current => {
    if (current.type === 'TSImportType' && typeof current.source?.value === 'string') {
      found.specifier = current.source.value;
    }
    if (current.type === 'TSLiteralType' && typeof current.literal?.value === 'string') {
      found.exportName = current.literal.value;
    }
  });
  return found.specifier.length === 0 ? null : found;
}

function targetFromSpecifier(entry: DeclarationEntry, declarationFile: string): TagTarget | null {
  const imported = entry.exportName === 'default' ? entry.name : entry.exportName;
  if (!entry.specifier.startsWith('.')) {
    return { imported, kind: 'package', source: entry.specifier };
  }
  const absolute = path.resolve(path.dirname(declarationFile), entry.specifier);
  const packageName = packageFromPath(absolute);
  if (packageName !== null) return { imported, kind: 'package', source: packageName };
  if (!existsSync(absolute)) return null;
  return { file: absolute, kind: 'file' };
}

function packageFromPath(file: string): string | null {
  const parts = file.split(path.sep);
  const index = parts.lastIndexOf('node_modules');
  const name = index < 0 ? undefined : parts[index + 1];
  if (name === undefined || name.length === 0) return null;
  if (!name.startsWith('@')) return packageNameOf(name);
  const scoped = parts[index + 2];
  return scoped === undefined || scoped.length === 0 ? null : `${name}/${scoped}`;
}
