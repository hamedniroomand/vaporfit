import { filled } from './filled.ts';
import type { ScriptFacts } from './script.ts';

export interface ResolvedBinding {
  kind:
    | 'import'
    | 'namespace'
    | 'object'
    | 'function'
    | 'vapor'
    | 'local-file'
    | 'unreadable'
    | 'missing'
    | 'element';
  imported?: string;
  source?: string;
  start?: number;
}

export function resolveBinding(name: string, facts: ScriptFacts, depth = 0): ResolvedBinding {
  const imported = facts.imports.find(item => item.local === name);
  if (imported !== undefined) return importBinding(imported);
  const local = facts.locals.get(name);
  if (local === undefined) return { kind: 'missing' };
  if (local.kind === 'alias' && depth < 1) return resolveBinding(local.target, facts, depth + 1);
  if (local.kind === 'member' && depth < 1) return memberBinding(local, facts, depth);
  if (local.kind === 'object') return { kind: 'object', start: local.start };
  if (local.kind === 'function') return { kind: 'function', start: local.start };
  if (local.kind === 'vapor') return { kind: 'vapor', start: local.start };
  return { kind: 'unreadable', start: local.start };
}

function importBinding(imported: ScriptFacts['imports'][number]): ResolvedBinding {
  if (imported.kind === 'namespace') return { kind: 'namespace', source: imported.source };
  if (imported.source.startsWith('.')) return { kind: 'local-file', source: imported.source };
  return { imported: imported.imported, kind: 'import', source: imported.source };
}

function memberBinding(
  local: { object: string; property: string; start: number },
  facts: ScriptFacts,
  depth: number,
): ResolvedBinding {
  const object = resolveBinding(local.object, facts, depth + 1);
  if (object.kind === 'namespace' && filled(object.source)) {
    return { imported: local.property, kind: 'import', source: object.source };
  }
  return { kind: 'unreadable', start: local.start };
}
