import { getPageDbConnection, getThemeModel } from '@/utils/db';
import { mergeThemeConfig } from './cssVars.site';
import {
  getActiveThemeCache,
  setActiveThemeCache,
  type ActiveTheme,
} from './theme-cache';
import { DEFAULT_THEME_CONFIG } from './cssVars.site';
import type { ITheme } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Load the tenant's active theme (config + component variants), merged with the
 * defaults. Cache-first; always resolves to a valid theme and NEVER throws — on
 * any error it falls back to DEFAULT_THEME_CONFIG so public pages keep rendering.
 */
export async function getActiveTheme(): Promise<ActiveTheme> {
  const cached = getActiveThemeCache();
  if (cached) return cached;

  const fallback: ActiveTheme = {
    id: null,
    slug: null,
    name: null,
    config: DEFAULT_THEME_CONFIG,
    componentVariants: {},
  };

  try {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = (await Theme.findOne({ isActive: true }).lean().exec()) as
      | (ITheme & { _id: unknown })
      | null;

    if (!doc) {
      setActiveThemeCache(fallback);
      return fallback;
    }

    const value: ActiveTheme = {
      id: String(doc._id),
      slug: doc.slug ?? null,
      name: doc.name ?? null,
      config: mergeThemeConfig(doc.theme),
      componentVariants: (doc.componentVariants as ComponentVariants) || {},
    };
    setActiveThemeCache(value);
    return value;
  } catch {
    // Do not cache failures (so we retry next request), just fall back.
    return fallback;
  }
}
