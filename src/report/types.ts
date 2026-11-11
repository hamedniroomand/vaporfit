import type { CompatData, Evidence, Failure } from '#data/types.ts';

export type Verdict = 'ready' | 'blocked' | 'unknown';
export type Level = 'error' | 'unknown' | 'note';
export type PluginState = 'installed' | 'not-installed' | 'undetermined';
export type CompilerSource = 'project' | 'tool';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface PackageCause {
  name: string;
  version: string | null;
  verified: string;
}

/** A finding. `evidence` is the data array, or a short source mark for a tool rule. */
export interface Finding {
  rule: string;
  level: Level;
  failure: Failure;
  message: string;
  location: SourceLocation;
  evidence: Evidence[] | string[];
  chain?: string[];
  package?: PackageCause;
  /** Declared library version for a pure-tier cause. `null` means no declaration. */
  declared?: string | null;
  /** Definition of a local directive in the script. */
  definition?: SourceLocation;
}

export interface ComponentReport {
  id: string;
  file: string;
  vapor: boolean;
  interop: Verdict;
  pure: Verdict;
  findings: Finding[];
  unresolved: string[];
}

export interface Report {
  schemaVersion: 0;
  tool: { version: string; data: string };
  project: {
    root: string;
    vue: string | null;
    compiler: { source: CompilerSource; version: string };
    interopPlugin: {
      state: PluginState;
      level: Level | null;
      location: SourceLocation | null;
    };
    /** `stale`: the libraries in `withData` with a `verified.date` more than 30 days old. */
    coverage: { withData: string[]; withoutData: string[]; stale: string[] };
  };
  summary: {
    components: number;
    interop: { ready: number; blocked: number; unknown: number };
    pure: { ready: number; blocked: number; unknown: number };
  };
  components: ComponentReport[];
  groups: { rule: string; components: number }[];
  /** Component ids that are not pure ready, leaves first. */
  order: string[];
}

export interface AnalyzeOptions {
  data?: CompatData;
}
