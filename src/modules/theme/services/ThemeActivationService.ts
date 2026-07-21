import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/errors';
import { invalidateActiveThemeCache } from '@/lib/theme/theme-cache';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';
import { ThemeRepository } from '../repositories/ThemeRepository';
import type { ITheme } from '@/types/theme';

export interface ThemeActivateOptions {
  /**
   * When true, rewrite the homepage (and header/footer chrome) into editable
   * page-editor blocks so the user can customize the theme layout.
   * When false/omitted, only activate the theme for live-site styling.
   */
  applyToEditor?: boolean;
}

export interface ThemeActivateResult {
  theme: ITheme & { _id: string };
  appliedToEditor: {
    pageId: string;
    slug: string;
    blockCount: number;
    header: string;
    footer: string;
  } | null;
}

/**
 * ThemeActivationService — activate a theme for the live site.
 *
 * Steps:
 *  1. Ensure theme is installed (auto-install package themes when possible)
 *  2. Deactivate every other theme
 *  3. Activate selected theme
 *  4. Sync WebsitePreferences.theme to the slug
 *  5. Optionally apply homepage layout into the page editor canvas
 *  6. Invalidate active-theme cache + revalidate public ISR paths
 */
export const ThemeActivationService = {
  async activate(
    themeId: string,
    opts: ThemeActivateOptions = {}
  ): Promise<ThemeActivateResult> {
    const target = await ThemeRepository.getDocument(themeId);
    if (!target) throw new ApiError('Theme not found', 404);

    if (target.isPackageTheme && !target.installed) {
      const { ThemeInstaller } = await import('./ThemeInstaller');
      await ThemeInstaller.install(themeId);
      target.installed = true;
    }

    await ThemeRepository.deactivateAllExcept(String(target._id));
    target.isActive = true;
    target.installed = true;
    await target.save();

    await syncWebsitePreferencesTheme(target.slug);

    let appliedToEditor: ThemeActivateResult['appliedToEditor'] = null;

    if (opts.applyToEditor) {
      try {
        const { ThemeLayoutApplyService } = await import('./ThemeLayoutApplyService');
        const result = await ThemeLayoutApplyService.applyLayout(String(target._id));
        appliedToEditor = {
          pageId: result.pageId,
          slug: result.slug,
          blockCount: result.blockCount,
          header: result.header,
          footer: result.footer,
        };
      } catch (err) {
        console.warn('applyToEditor on activate failed; falling back to chrome only:', err);
        try {
          const { applyThemeHeaderFooter } = await import('../utils/ThemeChromeApply');
          const pageDb = await getPageDbConnection();
          await applyThemeHeaderFooter(pageDb, target.toObject() as ITheme, {
            forceDefaults: true,
          });
        } catch (chromeErr) {
          console.warn('Theme header/footer apply on activate failed:', chromeErr);
        }
      }
    }

    invalidateActiveThemeCache();
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/[slug]', 'page');
    } catch {
      // ignore
    }

    const plain = await ThemeRepository.findById(String(target._id));
    if (!plain) throw new ApiError('Theme not found', 404);
    return { theme: plain, appliedToEditor };
  },
};

async function syncWebsitePreferencesTheme(slug: string): Promise<void> {
  try {
    const pageDb = await getPageDbConnection();
    const WebsitePreferences = getWebsitePreferencesModel(pageDb);
    await WebsitePreferences.updateMany({}, { $set: { theme: slug } }).exec();
  } catch {
    // Preferences may not exist yet (pre-onboarding) — non-fatal
  }
}
