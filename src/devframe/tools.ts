import { analyze, getComponent, listComponents } from '#index.ts';
import type { Verdict } from '#report/types.ts';

export interface ToolSpec {
  id: string;
  description: string;
  safety: 'read';
  inputSchema: Record<string, unknown>;
  run: (root: string, args: unknown) => unknown;
}

const verdictSchema = {
  description: 'Keep components with this verdict.',
  enum: ['ready', 'blocked', 'unknown'],
  type: 'string',
};

export const tools: readonly ToolSpec[] = [
  {
    description:
      'List the components with the interop verdict and the pure verdict. Set verdict to ready, blocked, or unknown to keep one interop group.',
    id: 'list_components',
    inputSchema: {
      additionalProperties: false,
      properties: { verdict: verdictSchema },
      type: 'object',
    },
    run: listRows,
    safety: 'read',
  },
  {
    description:
      'Return the interop verdict, the pure verdict, and the findings for one component. id is the path from the project root.',
    id: 'get_component',
    inputSchema: {
      additionalProperties: false,
      properties: {
        id: { description: 'The component id.', type: 'string' },
      },
      required: ['id'],
      type: 'object',
    },
    run: oneComponent,
    safety: 'read',
  },
  {
    description: 'Return the counts, the groups, the plugin state, and the coverage.',
    id: 'get_summary',
    inputSchema: { additionalProperties: false, properties: {}, type: 'object' },
    run: projectSummary,
    safety: 'read',
  },
];

function listRows(root: string, args: unknown): unknown {
  const verdict = verdictOf(args);
  const rows = listComponents(analyze(root), verdict === undefined ? undefined : { verdict });
  return rows.map(component => ({
    file: component.file,
    id: component.id,
    pure: component.pure,
    vapor: component.vapor,
    verdict: component.interop,
  }));
}

function oneComponent(root: string, args: unknown): unknown {
  const id = textField(args, 'id');
  if (id === undefined) return { findings: null, pure: null, verdict: null };
  const component = getComponent(analyze(root), id);
  if (component === undefined) return { findings: null, id, pure: null, verdict: null };
  return {
    findings: component.findings,
    id: component.id,
    pure: component.pure,
    verdict: component.interop,
  };
}

function projectSummary(root: string): unknown {
  const report = analyze(root);
  return {
    groups: report.groups,
    project: {
      coverage: report.project.coverage,
      interopPlugin: report.project.interopPlugin,
    },
    summary: report.summary,
  };
}

function verdictOf(args: unknown): Verdict | undefined {
  const value = textField(args, 'verdict');
  if (value === 'ready' || value === 'blocked' || value === 'unknown') return value;
  return undefined;
}

function textField(args: unknown, key: string): string | undefined {
  if (typeof args !== 'object' || args === null || !Object.hasOwn(args, key)) return undefined;
  const value = (args as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}
