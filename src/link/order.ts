import path from 'node:path';

import type { ComponentEdges } from '#project/graph.ts';
import { componentEdges } from '#project/graph.ts';
import type { Project } from '#project/project.ts';
import type { ComponentReport } from '#report/types.ts';

/** Component ids that are not pure ready. A leaf has no local Vue child and comes first. */
export function conversionOrder(project: Project, components: ComponentReport[]): string[] {
  const files = components.map(component => path.join(project.root, component.file));
  const edges = componentEdges(project, files);
  const depths = new Map<string, number>();
  return components
    .filter(component => component.pure !== 'ready')
    .map(component => component.id)
    .toSorted(
      (left, right) =>
        depthOf(left, edges, depths, new Set()) - depthOf(right, edges, depths, new Set()) ||
        left.localeCompare(right),
    );
}

/** The longest chain of local children below a component. A cycle counts as zero. */
function depthOf(
  id: string,
  edges: ComponentEdges,
  depths: Map<string, number>,
  seen: Set<string>,
): number {
  const cached = depths.get(id);
  if (cached !== undefined) return cached;
  if (seen.has(id)) return 0;
  let value = 0;
  const next = new Set([...seen, id]);
  for (const child of edges.get(id) ?? []) {
    value = Math.max(value, depthOf(child, edges, depths, next) + 1);
  }
  depths.set(id, value);
  return value;
}
