import path from 'node:path';

import type { VueCompiler } from '#compiler/vue-compiler.ts';
import { parseModule, walkNodes } from '#syntax/ast.ts';
import type { StaticImport, SyntaxNode } from '#syntax/ast.ts';
import { filled } from '#syntax/filled.ts';
import { scriptBodies } from '#syntax/script.ts';

import { projectFiles, readText, resolveLocal } from './files.ts';
import { remember } from './targets.ts';
import type { TagTarget } from './targets.ts';

const SCRIPT_EXTENSIONS = ['.vue', '.js', '.ts', '.mjs', '.cjs', '.mts', '.cts'];

interface AppScan {
  compiler: VueCompiler;
  map: Map<string, TagTarget>;
  unreadable: Set<string>;
}

interface AppFile {
  file: string;
  imports: StaticImport[];
}

export function readAppComponents(
  root: string,
  compiler: VueCompiler,
  unreadable: Set<string>,
): Map<string, TagTarget> {
  const scan: AppScan = { compiler, map: new Map(), unreadable };
  for (const file of projectFiles(root, isScript)) recordAppFile(file, scan);
  return scan.map;
}

function isScript(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return SCRIPT_EXTENSIONS.some(extension => name.endsWith(extension));
}

function recordAppFile(file: string, scan: AppScan): void {
  const source = readText(file);
  if (source === null) return;
  const blocks = file.endsWith('.vue') ? scriptBodies(source) : [source];
  const appFile: AppFile = { file, imports: [] };
  const programs: SyntaxNode[] = [];
  for (const block of blocks) {
    try {
      const parsed = parseModule(block, file);
      appFile.imports.push(...parsed.imports);
      programs.push(parsed.program);
    } catch {
      continue;
    }
  }
  for (const program of programs) {
    walkNodes(program, node => {
      recordCall(node, appFile, scan);
    });
  }
}

function recordCall(node: SyntaxNode, appFile: AppFile, scan: AppScan): void {
  if (node.type !== 'CallExpression' || node.callee?.type !== 'MemberExpression') return;
  if (node.callee.computed === true || node.callee.property?.name !== 'component') return;
  const nameArg = node.arguments?.[0];
  const valueArg = node.arguments?.[1];
  const literal =
    nameArg?.type === 'Literal' && typeof nameArg.value === 'string' ? nameArg.value : null;
  const target = valueArg === undefined ? null : valueTarget(valueArg, appFile, literal);
  if (literal !== null && target !== null) remember(scan.map, literal, target, scan.compiler);
  if (literal === null && target?.kind === 'file') scan.unreadable.add(target.file);
}

function valueTarget(
  value: SyntaxNode,
  appFile: AppFile,
  literal: string | null,
): TagTarget | null {
  if (value.type !== 'Identifier' || !filled(value.name)) return null;
  const imported = appFile.imports.find(item => item.local === value.name);
  if (imported === undefined) return null;
  if (imported.source.startsWith('.')) {
    const absolute = resolveLocal(path.dirname(appFile.file), imported.source);
    return absolute === null ? null : { file: absolute, kind: 'file' };
  }
  const name = imported.imported === 'default' ? literal : imported.imported;
  if (name === null || name.length === 0) return null;
  return { imported: name, kind: 'package', source: imported.source };
}
