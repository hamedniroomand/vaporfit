import type { CliIo } from './io.ts';

export const MCP_MISSING =
  'The packages devframe@1.3.2 and @devframes/agentic@1.3.2 are not installed.';

export async function serveReport(root: string, io: CliIo): Promise<number> {
  try {
    const { serveMcp } = await import('#devframe/serve.ts');
    await serveMcp(root);
    return 0;
  } catch (error) {
    if (!missingDevframe(error)) throw error;
    io.stderr(`vaporfit: ${MCP_MISSING}\n`);
    return 1;
  }
}

export function missingDevframe(error: unknown): boolean {
  return moduleNotFound(error) && mentionsDevframe(error);
}

function moduleNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if ((error as { code?: unknown }).code === 'ERR_MODULE_NOT_FOUND') return true;
  return moduleNotFound((error as { cause?: unknown }).cause);
}

function mentionsDevframe(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes('devframe') || error.message.includes('@devframes/agentic'))
    return true;
  return mentionsDevframe((error as { cause?: unknown }).cause);
}
