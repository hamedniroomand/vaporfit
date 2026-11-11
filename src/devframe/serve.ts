import type { McpServerHandle } from 'devframe';
import { createMcpServer } from 'devframe/adapters/mcp';

import manifest from '#pkg' with { type: 'json' };

import { createDefinition } from './definition.ts';

/** Serves the three tools over stdio. This does not add the shared-state tool. */
export async function serveMcp(root: string): Promise<McpServerHandle> {
  const handle = await createMcpServer(createDefinition(root), {
    exposeSharedState: false,
    instructions: 'These tools only read the vaporfit report. They do not change files.',
    serverName: 'vaporfit',
    serverVersion: manifest.version,
    transport: 'stdio',
  });
  return handle;
}
