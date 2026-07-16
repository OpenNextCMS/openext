/** Client-side semver-ish comparison for sorting theme cards (descending). */
function parts(v: string): number[] {
  return v
    .replace(/[^\d.]/g, '')
    .split('.')
    .map((n) => Number(n) || 0);
}

export function compareVersionsDesc(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
