import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/errors';
import { invalidateActiveThemeCache } from '@/lib/theme/theme-cache';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';
import { ThemeRepository } from '../repositories/ThemeRepository';
import type { ITheme } from '@/types/theme';

/**
 * ThemeActivationService — activate a theme for the live site.
 *
 * Steps:
 *  1. Ensure theme is installed (auto-install package themes when possible)
 *  2. Deactivate every other theme
 *  3. Activate selected theme
 *  4. Sync WebsitePreferences.theme to the slug
 *  5. Apply global header / footer templates from the package (upsert if missing)
 *  6. Optionally apply homepage layout when applyPageLayout is set
 *  7. Invalidate active-theme cache + revalidate public ISR paths
 */
export const ThemeActivationService = {
  async activate(themeId: string): Promise<ITheme & { _id: string }> {
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

    try {
      const { applyThemeHeaderFooter } = await import('../utils/ThemeChromeApply');
      const pageDb = await getPageDbConnection();
      await applyThemeHeaderFooter(pageDb, target.toObject() as ITheme, {
        forceDefaults: true,
      });
    } catch (err) {
      console.warn('Theme header/footer apply on activate failed:', err);
    }

    if (target.applyPageLayout) {
      try {
        const { ThemeLayoutApplyService } = await import('./ThemeLayoutApplyService');
        await ThemeLayoutApplyService.applyLayout(String(target._id));
      } catch (err) {
        console.warn('applyPageLayout on activate failed:', err);
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
    return plain;
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
