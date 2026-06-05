import type { ThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * In-process cache of the active theme. Mirrors the menu-redirect lifecycle
 * cache: a short TTL keeps the hot public-page path off the DB (active-theme
 * load well under 50ms) while writes call `invalidateActiveThemeCache()`.
 *
 * Per-tenant note: this process serves a single tenant (DB-per-tenant), so a
 * single module-level slot is correct.
 */

export interface ActiveTheme {
  id: string | null;
  slug: string | null;
  name: string | null;
  config: ThemeConfig;
  componentVariants: ComponentVariants;
}

let cache: { value: ActiveTheme; ts: number } | null = null;
const TTL_MS = 5000;

export function getActiveThemeCache(): ActiveTheme | null {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.value;
  return null;
}

export function setActiveThemeCache(value: ActiveTheme): void {
  cache = { value, ts: Date.now() };
}

export function invalidateActiveThemeCache(): void {
  cache = null;
}
