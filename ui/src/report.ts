import { connectDevframe } from 'devframe/client';

import { browserPage } from './browser.ts';

export const READY_SENTENCE =
  '"ready" means that vaporfit found no known problem. It does not test behavior.';

export interface ViewLocation {
  file: string;
  line: number;
  column: number;
}

export interface ViewFinding {
  rule: string;
  level: string;
  failure: string;
  message: string;
  location: ViewLocation;
  chain?: string[];
  package?: { name: string; version: string | null };
  evidence?: unknown;
}

export interface ViewComponent {
  id: string;
  file: string;
  vapor: boolean;
  interop: string;
  pure: string;
  findings: ViewFinding[];
}

export interface ViewReport {
  summary: {
    components: number;
    interop: { ready: number; blocked: number; unknown: number };
    pure: { ready: number; blocked: number; unknown: number };
  };
  project: {
    interopPlugin: {
      state: string;
      level: string | null;
      location: ViewLocation | null;
    };
    coverage: { withData: string[]; withoutData: string[] };
  };
  components: ViewComponent[];
  groups: { rule: string; components: number }[];
  tool: { version: string };
}

export function evidenceUrls(evidence: unknown): string[] {
  if (!Array.isArray(evidence)) return [];
  const urls: string[] = [];
  for (const item of evidence) {
    if (!isRecord(item)) continue;
    const url = item.url;
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      urls.push(url);
    }
  }
  return urls;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function pluginText(report: ViewReport): string[] {
  const plugin = report.project.interopPlugin;
  if (plugin.state === 'installed' || plugin.level === null) return [];
  if (plugin.state === 'undetermined') {
    return ['The tool cannot tell if the app has vaporInteropPlugin.'];
  }
  const lines = ['The app entry does not have vaporInteropPlugin.'];
  if (plugin.level === 'error') lines.push('A component that has vapor throws at mount.');
  return lines;
}

/** Loads the report. A live server refreshes. A static file reads the baked RPC once. */
export async function loadReport(apply: (report: ViewReport) => void): Promise<void> {
  const client = await connectDevframe();
  const read = async (): Promise<ViewReport> => {
    const value: unknown = await client.scope('vaporfit').rpc.call('get-report');
    return value as ViewReport;
  };
  apply(await read());
  if (client.connectionMeta.backend === 'static') return;
  browserPage().setInterval(() => {
    read()
      .then(apply)
      .catch(() => {
        return;
      });
  }, 1000);
}
