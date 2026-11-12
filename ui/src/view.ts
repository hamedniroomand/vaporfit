// Pure helpers for the report page. They do not touch the browser, so the tests can import them.

export type Verdict = 'ready' | 'blocked' | 'unknown';
export type Tier = 'interop' | 'pure';

export const VERDICTS: readonly Verdict[] = ['blocked', 'unknown', 'ready'];

export const VERDICT_LABEL: Record<Verdict, string> = {
  blocked: 'Blocked',
  ready: 'Ready',
  unknown: 'Unknown',
};

/** Labels for the failure types of the data. */
export const FAILURE_LABEL: Record<string, string> = {
  compile: 'Compile error',
  none: 'No effect',
  'runtime-error': 'Runtime error',
  silent: 'Fails silently',
};

const REPOSITORY = 'https://github.com/hamedniroomand/vaporfit';

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

export interface Route {
  view: 'summary' | 'components' | 'detail' | 'rankings' | 'libraries';
  id: string;
  tier: Tier;
  verdict: Verdict | 'all';
  rule: string;
  query: string;
}

/** Reads the hash of the page, for example `#/components?verdict=blocked&rule=vapor/v-memo`. */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/u, '');
  const mark = raw.indexOf('?');
  const path = mark === -1 ? raw : raw.slice(0, mark);
  const params = new URLSearchParams(mark === -1 ? '' : raw.slice(mark + 1));
  const verdict = params.get('verdict');
  const route: Route = {
    id: '',
    query: params.get('q') ?? '',
    rule: params.get('rule') ?? '',
    tier: params.get('tier') === 'pure' ? 'pure' : 'interop',
    verdict:
      verdict === 'ready' || verdict === 'blocked' || verdict === 'unknown' ? verdict : 'all',
    view: 'summary',
  };
  if (path.startsWith('component/')) {
    return { ...route, id: decodeURIComponent(path.slice('component/'.length)), view: 'detail' };
  }
  if (path === 'components' || path === 'rankings' || path === 'libraries') {
    return { ...route, view: path };
  }
  return route;
}

/** Writes the hash of the component list. Default values are not written. */
export function componentsHash(filter: Partial<Omit<Route, 'view' | 'id'>>): string {
  const params = new URLSearchParams();
  if (filter.verdict !== undefined && filter.verdict !== 'all')
    params.set('verdict', filter.verdict);
  if (filter.tier === 'pure') params.set('tier', 'pure');
  if (filter.rule !== undefined && filter.rule !== '') params.set('rule', filter.rule);
  if (filter.query !== undefined && filter.query !== '') params.set('q', filter.query);
  const text = params.toString();
  return text === '' ? '#/components' : `#/components?${text}`;
}

export function componentHash(id: string): string {
  return `#/component/${encodeURIComponent(id)}`;
}

export function verdictOf(component: ViewComponent, tier: Tier): Verdict {
  const value = tier === 'pure' ? component.pure : component.interop;
  return value === 'ready' || value === 'blocked' ? value : 'unknown';
}

export function countVerdicts(
  components: readonly ViewComponent[],
  tier: Tier,
): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { blocked: 0, ready: 0, unknown: 0 };
  for (const component of components) counts[verdictOf(component, tier)] += 1;
  return counts;
}

/** The share of a part in a total, as a whole percent. An empty total gives 0. */
export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/**
 * The components that match the filter. Blocked comes first, then unknown, then ready.
 * Inside one verdict, more findings come first, then the path.
 */
export function listComponents(
  components: readonly ViewComponent[],
  filter: Pick<Route, 'tier' | 'verdict' | 'rule' | 'query'>,
): ViewComponent[] {
  const query = filter.query.trim().toLowerCase();
  return components
    .filter(
      component => filter.verdict === 'all' || verdictOf(component, filter.tier) === filter.verdict,
    )
    .filter(
      component => filter.rule === '' || component.findings.some(item => item.rule === filter.rule),
    )
    .filter(component => query === '' || component.file.toLowerCase().includes(query))
    .toSorted(
      (left, right) =>
        VERDICTS.indexOf(verdictOf(left, filter.tier)) -
          VERDICTS.indexOf(verdictOf(right, filter.tier)) ||
        right.findings.length - left.findings.length ||
        left.file.localeCompare(right.file),
    );
}

/** Splits a path into the folder and the file name. The folder keeps its last `/`. */
export function splitPath(file: string): { folder: string; name: string } {
  const slash = file.lastIndexOf('/');
  return slash === -1
    ? { folder: '', name: file }
    : { folder: file.slice(0, slash + 1), name: file.slice(slash + 1) };
}

export interface FindingPlace {
  location: ViewLocation;
  chain: string[];
  package: string | null;
}

export interface FindingGroup {
  rule: string;
  level: string;
  failure: string;
  message: string;
  evidence: unknown;
  places: FindingPlace[];
}

const LEVEL_ORDER = ['error', 'unknown', 'note'];

function levelRank(level: string): number {
  const index = LEVEL_ORDER.indexOf(level);
  return index === -1 ? LEVEL_ORDER.length : index;
}

/** One group for each rule and message. Errors come first. The places keep the source order. */
export function groupFindings(findings: readonly ViewFinding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();
  for (const finding of findings) {
    const key = [finding.rule, finding.level, finding.message].join('\u0000');
    let group = groups.get(key);
    if (group === undefined) {
      group = {
        evidence: finding.evidence,
        failure: finding.failure,
        level: finding.level,
        message: finding.message,
        places: [],
        rule: finding.rule,
      };
      groups.set(key, group);
    }
    group.places.push({
      chain: finding.chain ?? [],
      location: finding.location,
      package:
        finding.package === undefined
          ? null
          : `${finding.package.name} ${finding.package.version ?? '(not installed)'}`,
    });
  }
  return [...groups.values()].toSorted(
    (left, right) => levelRank(left.level) - levelRank(right.level),
  );
}

export interface EvidenceLink {
  kind: 'probe' | 'issue' | 'source' | 'link';
  label: string;
  detail: string;
  url: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWebUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'));
}

/** A short label for a link: `owner/repo #12` for a GitHub issue, `owner/repo path` for a file. */
export function linkLabel(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const parts = parsed.pathname.split('/').filter(part => part !== '');
  if (parsed.hostname === 'github.com' && parts.length >= 2) {
    const repository = `${parts[0]}/${parts[1]}`;
    if ((parts[2] === 'issues' || parts[2] === 'pull') && parts[3] !== undefined) {
      return `${repository} #${parts[3]}`;
    }
    if ((parts[2] === 'blob' || parts[2] === 'tree') && parts.length > 4) {
      return `${repository} ${parts.slice(4).join('/')}${parsed.hash}`;
    }
    if (parts[2] === 'releases' && parts[3] === 'tag' && parts[4] !== undefined) {
      return `${repository} ${parts[4]}`;
    }
    if (parts[2] === 'commit' && parts[3] !== undefined) {
      return `${repository} ${parts[3].slice(0, 7)}`;
    }
    return repository;
  }
  return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
}

/** The links of a finding. A probe links to its folder in the vaporfit repository. */
export function evidenceLinks(evidence: unknown): EvidenceLink[] {
  if (!Array.isArray(evidence)) return [];
  const links: EvidenceLink[] = [];
  for (const item of evidence) {
    if (!isRecord(item)) continue;
    if (item.level === 'tested' && typeof item.probe === 'string' && item.probe !== '') {
      const what = typeof item.what === 'string' ? item.what : '';
      const where = typeof item.environment === 'string' ? item.environment : '';
      links.push({
        detail: [what, where].filter(text => text !== '').join(' · '),
        kind: 'probe',
        label: item.probe,
        url: `${REPOSITORY}/tree/main/${item.probe}`,
      });
      continue;
    }
    if (!isWebUrl(item.url)) continue;
    const kind = item.level === 'issue' ? 'issue' : item.level === 'source' ? 'source' : 'link';
    const state = typeof item.state === 'string' ? item.state : '';
    links.push({ detail: state, kind, label: linkLabel(item.url), url: item.url });
  }
  return links;
}

/** The last part of a path. The page shows the project name, not the full path. */
export function baseName(root: string): string {
  const parts = root.split(/[/\\]/u).filter(part => part !== '');
  return parts.at(-1) ?? root;
}
