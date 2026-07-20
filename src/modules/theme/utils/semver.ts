/**
 * Minimal semver utilities for theme package compatibility checks.
 * Supports exact, ^, ~, >=, >, <=, < ranges commonly used in compatibleCms.
 */

function parseSemver(version: string): { major: number; minor: number; patch: number } | null {
  const cleaned = version.trim().replace(/^v/i, '');
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function cmp(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number }
): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

/** Returns true when `version` satisfies a simple npm-like range in `range`. */
export function satisfiesSemver(version: string, range: string): boolean {
  const ver = parseSemver(version);
  if (!ver) return false;

  const raw = range.trim();
  if (!raw || raw === '*') return true;

  // Exact
  if (/^\d+\.\d+\.\d+$/.test(raw)) {
    const target = parseSemver(raw);
    return !!target && cmp(ver, target) === 0;
  }

  // Caret ^1.2.3 → >=1.2.3 <2.0.0 (for major>=1); ^0.2.3 → >=0.2.3 <0.3.0
  if (raw.startsWith('^')) {
    const target = parseSemver(raw.slice(1));
    if (!target) return false;
    if (cmp(ver, target) < 0) return false;
    if (target.major > 0) {
      return ver.major === target.major;
    }
    if (target.minor > 0) {
      return ver.major === 0 && ver.minor === target.minor;
    }
    return ver.major === 0 && ver.minor === 0 && ver.patch === target.patch;
  }

  // Tilde ~1.2.3 → >=1.2.3 <1.3.0
  if (raw.startsWith('~')) {
    const target = parseSemver(raw.slice(1));
    if (!target) return false;
    if (cmp(ver, target) < 0) return false;
    return ver.major === target.major && ver.minor === target.minor;
  }

  const opMatch = /^(>=|<=|>|<)\s*(.+)$/.exec(raw);
  if (opMatch) {
    const target = parseSemver(opMatch[2]);
    if (!target) return false;
    const c = cmp(ver, target);
    switch (opMatch[1]) {
      case '>=':
        return c >= 0;
      case '<=':
        return c <= 0;
      case '>':
        return c > 0;
      case '<':
        return c < 0;
    }
  }

  // Fallback: treat as exact if parseable
  const exact = parseSemver(raw);
  return !!exact && cmp(ver, exact) === 0;
}

export function isValidSemver(version: string): boolean {
  return parseSemver(version) !== null;
}
