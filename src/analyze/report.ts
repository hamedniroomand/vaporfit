import type { CompatData } from '#data/types.ts';
import { conversionOrder } from '#link/order.ts';
import manifest from '#pkg' with { type: 'json' };
import { coverageOf } from '#project/coverage.ts';
import { relativeId } from '#project/files.ts';
import { detectPlugin } from '#project/plugin.ts';
import type { Project } from '#project/project.ts';
import { findingGroups, pluginLevel, summarize } from '#report/summary.ts';
import type { ComponentReport, Report, SourceLocation } from '#report/types.ts';

export function buildReport(project: Project, components: ComponentReport[]): Report {
  const { compiler, root } = project;
  const plugin = detectPlugin(root);
  return {
    components,
    groups: findingGroups(components),
    // The key order of the JSON report is stable. Do not sort these keys.
    project: {
      compiler: { source: compiler.source, version: compiler.version },
      coverage: coverageOf(project),
      interopPlugin: {
        level: pluginLevel(plugin.state, components),
        location: relativeLocation(root, plugin.location),
        state: plugin.state,
      },
      root,
      vue: compiler.vue,
    },
    order: conversionOrder(project, components),
    schemaVersion: 0,
    summary: summarize(components),
    tool: { data: dataDate(project.data), version: manifest.version },
  };
}

function dataDate(data: CompatData): string {
  return (
    data.libraries
      .map(library => library.verified.date)
      .toSorted()
      .at(-1) ?? ''
  );
}

function relativeLocation(root: string, location: SourceLocation | null): SourceLocation | null {
  if (!location) return null;
  return { ...location, file: relativeId(root, location.file) };
}
