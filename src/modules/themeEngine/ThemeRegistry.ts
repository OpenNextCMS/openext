import type { Types } from 'mongoose';
import { themeRepository } from './repositories/ThemeRepository';
import { themeCache } from './ThemeCache';
import { ThemeActiveLockedError, ThemeNotFoundError, ThemeNotInstalledError } from './errors';
import type { IThemeEngineThemeDocument } from './models/Theme';
import type { ThemeInstallLogEntry, ThemeManifest } from './types';

/**
 * §4.4 ThemeRegistry — the only module that talks to MongoDB for theme
 * metadata and active-theme state (all actual Mongo access lives one layer
 * further down, in `repositories/ThemeRepository`, which this class alone
 * calls into).
 */
export class ThemeRegistry {
  /** Success-path write (spec §4.3 step 7 / §4.4). */
  async register(
    manifest: ThemeManifest,
    installPath: string,
    checksum: string,
    installedBy: Types.ObjectId | string,
    installLog: ThemeInstallLogEntry[] = [],
    assetHashes?: { stylesheet?: string; script?: string },
    assetPaths?: { stylesheet?: string; script?: string }
  ): Promise<IThemeEngineThemeDocument> {
    return themeRepository.upsertInstalled({
      manifest,
      installPath,
      checksum,
      installedBy,
      installLog,
      assetHashes,
      assetPaths,
    });
  }

  async list(): Promise<IThemeEngineThemeDocument[]> {
    return themeRepository.list();
  }

  async getBySlug(slug: string): Promise<IThemeEngineThemeDocument | null> {
    return themeRepository.findBySlug(slug);
  }

  async getActive(): Promise<IThemeEngineThemeDocument | null> {
    const cached = themeCache.getActive();
    if (cached !== undefined) return cached as IThemeEngineThemeDocument | null;

    const settings = await themeRepository.getSettings();
    const doc = settings.activeThemeSlug ? await themeRepository.findBySlug(settings.activeThemeSlug) : null;
    themeCache.setActive(doc as never);
    return doc;
  }

  /**
   * Transactional activate (spec §4.4):
   *   1. confirm theme status is 'installed'
   *   2. read current activeThemeSlug into previousThemeSlug (rollback target)
   *   3. set the new activeThemeSlug/activatedAt/activatedBy
   *   4. invalidate the cache AFTER the transaction commits — never before
   */
  async activate(slug: string, activatedBy: Types.ObjectId | string): Promise<void> {
    await themeRepository.withSession(async (session) => {
      const theme = await themeRepository.findBySlug(slug, session);
      if (!theme) throw new ThemeNotFoundError(slug);
      if (theme.status !== 'installed') throw new ThemeNotInstalledError(slug, theme.status);
      await themeRepository.setActiveSlug(slug, activatedBy, session);
    });
    // Cache invalidation happens strictly after the transaction has committed.
    themeCache.invalidateActive();
  }

  /** Revert to no active theme (ThemeManager's default-theme fallback then applies). */
  async deactivate(activatedBy: Types.ObjectId | string | null = null): Promise<void> {
    await themeRepository.withSession(async (session) => {
      await themeRepository.clearActiveSlug(activatedBy, session);
    });
    themeCache.invalidateActive();
  }

  async remove(slug: string): Promise<void> {
    const existing = await themeRepository.findBySlug(slug);
    if (!existing) throw new ThemeNotFoundError(slug);

    const settings = await themeRepository.getSettings();
    if (settings.activeThemeSlug === slug) throw new ThemeActiveLockedError(slug);
    await themeRepository.remove(slug);
    themeCache.invalidateTheme(slug);
  }

  /**
   * Roll back to the theme that was active before the most recent activation.
   * Returns the slug that was restored.
   */
  async rollback(activatedBy: Types.ObjectId | string): Promise<string> {
    let restoredSlug = '';
    await themeRepository.withSession(async (session) => {
      restoredSlug = await themeRepository.rollbackToPrevious(activatedBy, session);
    });
    themeCache.invalidateActive();
    return restoredSlug;
  }

  async getSettings() {
    return themeRepository.getSettings();
  }

  async getTemplates(slug: string) {
    const theme = await this.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return theme.templates?.length
      ? theme.templates
      : (theme.manifest.templateRegistry ?? []);
  }

  async getBlocks(slug: string) {
    const theme = await this.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return theme.manifest.blocks ?? [];
  }

  async getPartials(slug: string) {
    const theme = await this.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return (theme.partials as Record<string, string>) ?? theme.manifest.partials ?? {};
  }

  async getSettingsSchema(slug: string) {
    const theme = await this.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    const { flattenSettingsSchema } = await import('./settingsSchema');
    return flattenSettingsSchema(theme.manifest);
  }

  async getThemeDefaults(slug: string) {
    const theme = await this.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return theme.manifest.defaults ?? {};
  }

  async setHomepageTemplateKey(key: string | null): Promise<void> {
    await themeRepository.setHomepageTemplateKey(key);
  }
}

/** Convenience singleton. */
export const themeRegistry = new ThemeRegistry();
