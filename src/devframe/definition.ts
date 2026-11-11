import type { DevframeDefinition } from 'devframe';
import { defineDevframe, defineRpcFunction } from 'devframe';

import manifest from '#pkg' with { type: 'json' };

import { openReport } from './report-state.ts';
import { tools } from './tools.ts';

export function createDefinition(
  root: string | (() => string),
  options?: { watch?: boolean },
): DevframeDefinition {
  const folder = (): string => (typeof root === 'function' ? root() : root);
  return defineDevframe({
    cli: { auth: false, open: false },
    description: 'Before you add vapor to a Vue component, see what will silently break.',
    homepage: 'https://github.com/hamedniroomand/vaporfit',
    id: 'vaporfit',
    importMetaUrl: import.meta.url,
    name: 'vaporfit',
    packageName: manifest.name,
    setup(ctx): void {
      const project = folder();
      const report = openReport(project, options?.watch === true);
      const scope = ctx.scope('vaporfit');
      scope.rpc.register(
        defineRpcFunction({
          handler: () => report.read(),
          jsonSerializable: true,
          name: 'get-report',
          snapshot: true,
          type: 'query',
        }),
      );
      for (const tool of tools) {
        ctx.agent.registerTool({
          description: tool.description,
          handler: (args: unknown) => tool.run(project, args),
          id: tool.id,
          inputSchema: tool.inputSchema,
          safety: tool.safety,
        });
      }
    },
    version: manifest.version,
  });
}
