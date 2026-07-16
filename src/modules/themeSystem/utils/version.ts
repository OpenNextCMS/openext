import { InvalidVersionError } from '../errors';

/**
 * Dependency-free semantic-version utilities (spec §10 update compare, §15
 * compatibility checks). No external `semver` package so the module is portable.
 *
 * Supports: exact `1.2.3`, and range prefixes `^1.2.3`, `~1.2.3`, `>=1.2.3`,
 * `>1.2.3`, `<=1.2.3`, `<1.2.3`, and `*` / `x` wildcards for minimums.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  /** Pre-release identifiers (e.g. `beta.1`) — compared with lower precedence. */
  prerelease: string[];
  raw: string;
}

const CORE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

/** Parse a strict semver string, throwing InvalidVersionError on malformed input. */
export function parseSemver(input: string): SemVer {
  const raw = String(input ?? '').trim();
  const m = CORE.exec(raw);
  if (!m) throw new InvalidVersionError(`"${raw}" is not a valid semantic version (expected e.g. 1.0.0).`, { input: raw });
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ? m[4].split('.') : [],
    raw,
  };
}

/** True when `input` is a valid semver string. */
export function isValidSemver(input: string): boolean {
  try {
    parseSemver(input);
    return true;
  } catch {
    return false;
  }
}

function comparePrerelease(a: string[], b: string[]): number {
  // A version WITH prerelease has LOWER precedence than one without.
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d < 0 ? -1 : 1;
    } else if (nx !== ny) {
      return nx ? -1 : 1; // numeric identifiers are lower than alphanumeric
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** Returns -1, 0, or 1 for a<b, a==b, a>b. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (va[key] !== vb[key]) return va[key] < vb[key] ? -1 : 1;
  }
  const pre = comparePrerelease(va.prerelease, vb.prerelease);
  return pre < 0 ? -1 : pre > 0 ? 1 : 0;
}

/** True when `candidate` is strictly newer than `current` (§10). */
export function isNewer(candidate: string, current: string): boolean {
  return compareSemver(candidate, current) === 1;
}

/**
 * Does `version` satisfy a `range`? Handles the minimum/compat forms declared in
 * a theme manifest (`minimumCMSVersion`, dependency ranges). Empty/`*`/`x` = any.
 */
export function satisfies(version: string, range: string): boolean {
  const r = String(range ?? '').trim();
  if (!r || r === '*' || r === 'x' || r === 'latest') return true;

  const v = parseSemver(version);

  const opMatch = /^(>=|<=|>|<|\^|~|=)?\s*(.+)$/.exec(r);
  if (!opMatch) return false;
  const op = opMatch[1] || '>=';
  const target = parseSemver(opMatch[2]);
  const cmp = compareSemver(v.raw, target.raw);

  switch (op) {
    case '=':
      return cmp === 0;
    case '>':
      return cmp === 1;
    case '>=':
      return cmp >= 0;
    case '<':
      return cmp === -1;
    case '<=':
      return cmp <= 0;
    case '^':
      // Compatible within the same major (>=target, <next-major); for 0.x, within same minor.
      if (cmp < 0) return false;
      if (target.major > 0) return v.major === target.major;
      if (target.minor > 0) return v.major === 0 && v.minor === target.minor;
      return v.major === 0 && v.minor === 0 && v.patch === target.patch;
    case '~':
      // >=target and <next-minor.
      if (cmp < 0) return false;
      return v.major === target.major && v.minor === target.minor;
    default:
      return cmp >= 0;
  }
}

/** Compare two Node.js version strings (strips a leading `v`). */
export function nodeSatisfiesMinimum(current: string, minimum: string): boolean {
  const clean = current.replace(/^v/i, '');
  return compareSemver(clean, minimum) >= 0;
}
