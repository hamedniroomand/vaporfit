import { connectDevframe } from 'devframe/client';

import { browserPage } from './browser.ts';

export const READY_SENTENCE =
  '"ready" means that vaporfit found no known problem. It does not test behavior.';

export type { ViewComponent, ViewFinding, ViewLocation } from './view.ts';
import type { ViewComponent, ViewLocation } from './view.ts';

export interface ViewReport {
  summary: {
    components: number;
    interop: { ready: number; blocked: number; unknown: number };
    pure: { ready: number; blocked: number; unknown: number };
  };
  project: {
    root: string;
    vue: string | null;
    compiler: { source: string; version: string };
    interopPlugin: {
      state: string;
      level: string | null;
      location: ViewLocation | null;
    };
    coverage: { withData: string[]; withoutData: string[]; stale?: string[] };
  };
  components: ViewComponent[];
  groups: { rule: string; components: number }[];
  tool: { version: string; data: string };
}

export type Tone = 'ready' | 'blocked' | 'unknown';

/** The tone of the plugin callout. An error blocks each Vapor component at mount. */
export function pluginTone(report: ViewReport): Tone {
  const plugin = report.project.interopPlugin;
  if (plugin.state === 'installed') return 'ready';
  if (plugin.level === 'error') return 'blocked';
  return 'unknown';
}

export function pluginTitle(report: ViewReport): string {
  const { state } = report.project.interopPlugin;
  if (state === 'installed') return 'vaporInteropPlugin is installed';
  if (state === 'undetermined') return 'vaporInteropPlugin: not determined';
  return 'vaporInteropPlugin is not installed';
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
