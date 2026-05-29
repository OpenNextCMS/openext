import type { ContentItem, MenuItem } from '@/types/menu-redirect';

/** Normalize a label for comparison: lowercase, alphanumerics + single spaces. */
export function normalizeLabel(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Similarity in [0,1]: exact=1, substring=0.85, else word-overlap (Dice). */
export function similarity(a: string, b: string): number {
  const na = normalizeLabel(a);
  const nb = normalizeLabel(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = new Set(na.split(' '));
  const bw = new Set(nb.split(' '));
  const inter = [...aw].filter((w) => bw.has(w)).length;
  const denom = aw.size + bw.size;
  return denom === 0 ? 0 : (2 * inter) / denom;
}

function bestMatch(
  label: string,
  candidates: ContentItem[],
  threshold: number
): { item: ContentItem; score: number } | null {
  let best: { item: ContentItem; score: number } | null = null;
  for (const c of candidates) {
    const score = similarity(label, c.label);
    if (!best || score > best.score) best = { item: c, score };
  }
  return best && best.score >= threshold ? best : null;
}

export interface AutoMatchRow {
  menuItem: MenuItem;
  suggestion: ContentItem | null;
  confidence: number;
}

/**
 * For each menu item, fuzzy-match its label against pages, then blogs, then
 * categories, and keep the highest-confidence suggestion above `threshold`.
 */
export function autoMatch(
  menuItems: MenuItem[],
  sources: { pages: ContentItem[]; blogs: ContentItem[]; categories: ContentItem[] },
  threshold = 0.5
): AutoMatchRow[] {
  return menuItems.map((menuItem) => {
    const matches = [
      bestMatch(menuItem.label, sources.pages, threshold),
      bestMatch(menuItem.label, sources.blogs, threshold),
      bestMatch(menuItem.label, sources.categories, threshold),
    ].filter((m): m is { item: ContentItem; score: number } => !!m);
    matches.sort((a, b) => b.score - a.score);
    const top = matches[0] ?? null;
    return { menuItem, suggestion: top?.item ?? null, confidence: top?.score ?? 0 };
  });
}
