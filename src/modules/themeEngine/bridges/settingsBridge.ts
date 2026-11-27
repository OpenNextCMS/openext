import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import { getSiteUrl } from '@/lib/seo/url';
import { resolveSiteIconUrl } from '@/lib/media/siteIcon';
import { getOrLoadCached, settingsCacheTtlMs } from '@/lib/cache/settingsCache';
import { themeRepository } from '../repositories/ThemeRepository';
import { themeCustomizationRepository } from '../repositories/ThemeCustomizationRepository';
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
 * (local filename → `/siteicon/{filename}`, or absolute/S3 URL as-is),
 * `getSiteUrl() -> url` (there is no `url` field on `Settings`).
 */
export async function resolveSiteSettings(): Promise<CmsSiteSettings> {
  return getOrLoadCached('cms-site-settings', settingsCacheTtlMs(), async () => {
    await getUserDbConnection(); // Settings lives on the global user DB, not per-tenant.
    const SettingsModel = getSettingsModel();
    const doc = await SettingsModel.findOne({})
      .select('siteTitle tagline siteIcon')
      .lean()
      .exec();

    return {
      name: doc?.siteTitle || 'Untitled Site',
      url: getSiteUrl(),
      description: doc?.tagline || '',
      logo: resolveSiteIconUrl(doc?.siteIcon),
    };
  });
}

/** Saved customizer values for a theme slug (theme_engine_customizations + legacy perThemeSettings). */
export async function resolveThemeSettingValues(activeSlug: string | null): Promise<Record<string, unknown>> {
  if (!activeSlug) return {};
  const [customizations, settingsDoc] = await Promise.all([
    themeCustomizationRepository.get(activeSlug),
    themeRepository.getSettings(),
  ]);
  const legacy = settingsDoc.perThemeSettings?.[activeSlug] ?? {};
  return { ...legacy, ...customizations };
}

/** Site-wide homepage template override from theme_engine_settings. */
export async function resolveHomepageTemplateKey(): Promise<string | null> {
  const settingsDoc = await themeRepository.getSettings();
  const key = settingsDoc.homepageTemplateKey;
  return typeof key === 'string' && key.trim() ? key.trim() : null;
}
