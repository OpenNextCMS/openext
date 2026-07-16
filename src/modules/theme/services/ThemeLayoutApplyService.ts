import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/errors';
import { getPageDbConnection, getPageModel, getWebsitePreferencesModel } from '@/utils/db';
import { ThemeRepository } from '../repositories/ThemeRepository';
import { buildPageBlocksFromTheme } from '../utils/ThemeLayoutBuilder';
import { applyThemeHeaderFooter } from '../utils/ThemeChromeApply';
import type { ITheme } from '@/types/theme';

/**
 * Applies a theme's layouts/*.json (+ presets + variants) to the live homepage
 * so the public page structure matches the theme preview. Also applies
 * templates/header.json + footer.json (or layout navbar/footer sections)
 * onto global header/footer pages — creating them if missing.
 */
export const ThemeLayoutApplyService = {
  async applyLayout(
    themeId: string,
    opts?: { layoutKey?: string }
  ): Promise<{
    pageId: string;
    slug: string;
    blockCount: number;
    header: string;
    footer: string;
  }> {
    const theme = await ThemeRepository.findById(themeId);
    if (!theme) throw new ApiError('Theme not found', 404);

    // Template (WordPress-style) themes render their own HTML — there is no block
    // layout to "apply". Activating them is enough; treat Apply layout as a no-op
    // success (revalidate the public routes) instead of erroring.
    const isTemplateTheme =
      (theme as { meta?: { renderer?: string } }).meta?.renderer === 'template';
    if (isTemplateTheme) {
      try {
        revalidatePath('/');
        revalidatePath('/[slug]', 'page');
      } catch {
        // outside request context
      }
      return { pageId: '', slug: '', blockCount: 0, header: 'skipped', footer: 'skipped' };
    }

    const layoutKey = opts?.layoutKey || 'default';
    const hasLayouts = theme.layouts && Object.keys(theme.layouts).length > 0;
    const hasTemplates =
      !!theme.templates?.header || !!theme.templates?.footer;
    if (
      !hasLayouts &&
      !hasTemplates &&
      !(theme.componentVariants && Object.keys(theme.componentVariants).length)
    ) {
      throw new ApiError(
        'This theme has no layouts, templates, or section variants to apply.',
        400
      );
    }

    const { body, chrome } = buildPageBlocksFromTheme(theme, layoutKey);

    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);

    // Always apply header/footer (templates → layout chrome → synthetic defaults).
    // Force defaults so apply never silently leaves old onboarding chrome in place.
    const chromeResult = await applyThemeHeaderFooter(pageDb, theme, {
      chromeFromLayout: chrome,
      createdBy: theme.createdBy,
      forceDefaults: true,
    });

    let pageId = '';
    let slug = '';
    let blockCount = 0;

    if (body.length > 0) {
      const home = await findHomepage(Page);
      if (!home) {
        throw new ApiError(
          'No homepage found. Create or publish a home page first, then apply the theme layout.',
          404
        );
      }

      home.component = body as unknown[];
      home.isPublished = true;
      await home.save();
      pageId = String(home._id);
      slug = String(home.slug || '');
      blockCount = body.length;
    } else if (!hasTemplates && chromeResult.header === 'skipped' && chromeResult.footer === 'skipped') {
      throw new ApiError('Theme layout produced no page sections or chrome to apply.', 400);
    }

    try {
      if (slug) revalidatePath(`/${slug}`);
      revalidatePath('/');
    } catch {
      // ignore outside request context
    }

    return {
      pageId,
      slug,
      blockCount,
      header: chromeResult.header,
      footer: chromeResult.footer,
    };
  },

  /** Persist the per-theme “match site layout” option. */
  async setApplyPageLayout(themeId: string, applyPageLayout: boolean): Promise<ITheme & { _id: string }> {
    const updated = await ThemeRepository.updateById(themeId, { applyPageLayout });
    if (!updated) throw new ApiError('Theme not found', 404);
    return updated;
  },
};

async function findHomepage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Page: any
) {
  let home = await Page.findOne({ isHome: true, pageType: 'page' }).exec();
  if (home) return home;

  try {
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);
    const prefs = await Prefs.findOne({}).lean().exec();
    const homepageSlug = (prefs as { homepageSlug?: string } | null)?.homepageSlug;
    if (homepageSlug) {
      home = await Page.findOne({ slug: homepageSlug, pageType: 'page' }).exec();
      if (home) return home;
    }
  } catch {
    // preferences optional
  }

  home = await Page.findOne({ slug: 'home', pageType: 'page' }).exec();
  if (home) return home;

  home = await Page.findOne({ slug: 'index', pageType: 'page' }).exec();
  if (home) return home;

  return Page.findOne({ pageType: 'page', isPublished: true }).sort({ updatedAt: -1 }).exec();
}
