/** The version of the data format. Version 0 is unstable and can change in each release. */
export const SCHEMA_VERSION = 0;

export type Tier = 'interop' | 'pure';
export type Failure = 'compile' | 'runtime-error' | 'silent' | 'none';
export type Status = 'works' | 'partial' | 'broken' | 'unknown';
export type Depth = 'D0' | 'D1' | 'D2' | 'D3';
export type DeclaredScope = 'full' | 'partial' | 'interop-only';

export interface Verified {
  vue: string;
  date: string;
  version?: string;
}

export interface Rule {
  schemaVersion: 0;
  id: string;
  title: string;
  tiers: Tier[];
  failure: Failure;
  detection: 'static' | 'data' | 'none';
  fix: string | null;
  verified: Verified;
  sources: string[];
}

export type Evidence =
  | { level: 'declared' }
  | {
      level: 'tested';
      depth: Depth;
      environment: string;
      probe: string | null;
      what?: string;
    }
  | { level: 'issue'; url: string; state: string }
  | { level: 'source'; url: string };

export type Match =
  | { kind: 'directive'; name: string; export: string | null; from: string }
  | { kind: 'globalProperty'; names: string[] }
  | { kind: 'prop'; name: string; from: string; components?: string[] }
  | { kind: 'import'; names: string[]; from: string };

export interface Feature {
  id: string;
  match: Match;
  status: Status;
  failure: Failure;
  message: string;
  evidence: Evidence[];
  fixedIn: string | null;
  /**
   * Optional. The first Vue version that fixes the feature. A project with this Vue version
   * or a later one gets no finding. A project with an unknown Vue version keeps the finding.
   */
  fixedInVue?: string;
}

export interface Library {
  schemaVersion: 0;
  package: string;
  repository: string;
  verified: Verified & { version: string };
  declared: {
    scope: DeclaredScope;
    since: string | null;
    url: string;
    quote: string;
  } | null;
  interop: { status: Status; evidence: Evidence[] };
  /** Optional. Same fields as `interop`. Absent on the checked library files. */
  pure?: { status: Status; evidence: Evidence[] };
  features: Feature[];
  notes?: string;
}

export interface CompatData {
  rules: Rule[];
  libraries: Library[];
}
