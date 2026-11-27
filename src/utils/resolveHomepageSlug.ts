import { getPageDbConnection, getPageModel } from '@/utils/db';
import { DEFAULT_SITE_LOCALE } from '@/lib/i18n/siteLanguages';

/**
 * Returns the slug of the homepage for a given content locale.
 * Prefers `isHome` in that locale, then falls back to default locale / legacy
 * unless `strictLocale` is set (multilingual mode).
 * Only published pages are eligible for the public homepage.
 */
export async function resolveHomepageSlug(
  locale?: string,
  options?: { strictLocale?: boolean }
): Promise<string | null> {
  try {
    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);
    const preferred = locale || DEFAULT_SITE_LOCALE;
    const strict = !!options?.strictLocale;
    const published = { isPublished: true };

    const flaggedLocale = (await Page.findOne({
      ...published,
      isHome: true,
      pageType: 'page',
      locale: preferred,
    })
      .sort({ updatedAt: -1 })
      .select('slug')
      .lean()
      .exec()) as { slug?: string } | null;
    if (flaggedLocale?.slug) return String(flaggedLocale.slug);

    // Same slug as the default-locale home, but for this locale (common after Translate).
    if (preferred !== DEFAULT_SITE_LOCALE || strict) {
      const defaultHome = (await Page.findOne({
        ...published,
        isHome: true,
        pageType: 'page',
      })
        .sort({ updatedAt: -1 })
        .select('slug translationGroupId')
        .lean()
        .exec()) as { slug?: string; translationGroupId?: string } | null;

      if (defaultHome?.translationGroupId) {
        const siblingHome = (await Page.findOne({
          ...published,
          translationGroupId: defaultHome.translationGroupId,
          locale: preferred,
          pageType: 'page',
        })
          .select('slug')
          .lean()
          .exec()) as { slug?: string } | null;
        if (siblingHome?.slug) return String(siblingHome.slug);
      }

      if (defaultHome?.slug && !strict) {
        const sameSlug = (await Page.findOne({
          ...published,
          slug: defaultHome.slug,
          locale: preferred,
          pageType: 'page',
        })
          .select('slug')
          .lean()
          .exec()) as { slug?: string } | null;
        if (sameSlug?.slug) return String(sameSlug.slug);
      }
    }

    if (strict) return null;

    const flaggedHome = (await Page.findOne({
      ...published,
      isHome: true,
      pageType: 'page',
    })
      .sort({ updatedAt: -1 })
      .select('slug')
      .lean()
      .exec()) as { slug?: string } | null;
    if (flaggedHome?.slug) return String(flaggedHome.slug);

    const envSlug = process.env.DEFAULT_HOME_SLUG?.trim();
    if (envSlug) {
      const envHome = (await Page.findOne({
        ...published,
        slug: envSlug,
        pageType: 'page',
      })
        .select('slug')
        .lean()
        .exec()) as { slug?: string } | null;
      if (envHome?.slug) return String(envHome.slug);
    }

    for (const fallbackSlug of ['default_home', 'home'] as const) {
      const candidate = (await Page.findOne({
        ...published,
        slug: fallbackSlug,
        pageType: 'page',
      })
        .select('slug')
        .lean()
        .exec()) as { slug?: string } | null;
      if (candidate?.slug) return String(candidate.slug);
    }

    return null;
  } catch (err) {
    console.error('[resolveHomepageSlug]', err);
    return null;
  }
}
