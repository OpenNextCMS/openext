import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import { getSiteUrl } from '@/lib/seo/url';
import { themeRepository } from '../repositories/ThemeRepository';
import type { CmsSiteSettings } from '../types';

/**
 * `site()`/`settings()` bridge (spec §4.11). Bridges live OUTSIDE the engine
 * proper — they translate existing CMS reads into the engine's opaque
 * `Cms*` shapes and are called only while ASSEMBLING a `RenderInput`, before
 * `ThemeManager.renderPage()` — the engine itself (including `ThemeAPI`)
 * never queries Mongo (spec §0).
 *
 * Field mapping (the real `Settings` model does not match `CmsSiteSettings`
 * 1:1): `siteTitle -> name`, `tagline -> description`, `siteIcon -> logo`
 * (resolved to the existing `/siteicon/{filename}` route — reused as-is, no
 * new route), `getSiteUrl() -> url` (there is no `url` field on `Settings`).
 */
export async function resolveSiteSettings(): Promise<CmsSiteSettings> {
  await getUserDbConnection(); // Settings lives on the global user DB, not per-tenant.
  const SettingsModel = getSettingsModel();
  const doc = await SettingsModel.findOne({}).lean().exec();

  return {
    name: doc?.siteTitle || 'Untitled Site',
    url: getSiteUrl(),
    description: doc?.tagline || '',
    logo: doc?.siteIcon ? `/siteicon/${doc.siteIcon}` : null,
  };
}

/** This theme's saved settings VALUES (`theme_settings.perThemeSettings[slug]`) — defaults are layered in by `ThemeAPI.settings()` from the manifest, not here. */
export async function resolveThemeSettingValues(activeSlug: string | null): Promise<Record<string, unknown>> {
  if (!activeSlug) return {};
  const settingsDoc = await themeRepository.getSettings();
  return settingsDoc.perThemeSettings?.[activeSlug] ?? {};
}
