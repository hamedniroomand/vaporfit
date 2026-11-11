interface ParsedVersion {
  core: [number, number, number];
  pre: string[];
}

/** Parses a major.minor.patch version. A leading v is allowed. Returns null when the text is not a version. */
export function parseVersion(input: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/u.exec(input.trim());
  if (match === null) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  const pre = match[4] !== undefined && match[4].length > 0 ? match[4].split('.') : [];
  return { core: [major, minor, patch], pre };
}

/** True when the version is Vue 3.6 or a later release, including 3.6 pre-releases. */
export function isVue36OrLater(version: string): boolean {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const [major, minor] = parsed.core;
  return major > 3 || (major === 3 && minor >= 6);
}

/** Positive when left is newer than right. Null when either text is not a version. */
export function compareVersions(left: string, right: string): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (a === null || b === null) return null;
  const core = compareCore(a.core, b.core);
  if (core !== 0) return core;
  return comparePre(a.pre, b.pre);
}

function compareCore(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    const aPart = left[index] ?? 0;
    const bPart = right[index] ?? 0;
    if (aPart !== bPart) return aPart > bPart ? 1 : -1;
  }
  return 0;
}

function comparePre(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const order = comparePreId(left[index], right[index]);
    if (order !== 0) return order;
  }
  return 0;
}

function comparePreId(left: string | undefined, right: string | undefined): number {
  if (left === undefined) return -1;
  if (right === undefined) return 1;
  if (left === right) return 0;
  const leftNumber = /^\d+$/u.test(left);
  const rightNumber = /^\d+$/u.test(right);
  if (leftNumber && rightNumber) return Number(left) > Number(right) ? 1 : -1;
  if (leftNumber) return -1;
  if (rightNumber) return 1;
  return left > right ? 1 : -1;
}

export function isNewerVersion(installed: string, verified: string): boolean {
  return compareVersions(installed, verified) === 1;
}
