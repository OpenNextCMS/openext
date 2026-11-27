import { getPageDbConnection, getPageModel } from '@/utils/db';
import { DEFAULT_SITE_LOCALE } from '@/lib/i18n/siteLanguages';

export type TranslationSibling = { locale: string; slug: string; isHome?: boolean };

/** List all locale variants linked by translationGroupId for a page. */
export async function getTranslationSiblings(
  page: {
    locale?: string;
    slug?: string;
    translationGroupId?: string;
    isHome?: boolean;
  } | null | undefined
): Promise<TranslationSibling[]> {
  if (!page) return [];

  try {
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    if (page.translationGroupId) {
      const rows = (await PageModel.find({ translationGroupId: page.translationGroupId })
        .select('locale slug isHome')
        .lean()
        .exec()) as { locale?: string; slug?: string; isHome?: boolean }[];

      return rows
        .filter((r) => r.slug)
        .map((r) => ({
          locale: r.locale || DEFAULT_SITE_LOCALE,
          slug: String(r.slug),
          isHome: !!r.isHome,
        }));
    }

    if (page.slug) {
      return [
        {
          locale: page.locale || DEFAULT_SITE_LOCALE,
          slug: String(page.slug),
          isHome: !!page.isHome,
        },
      ];
    }
  } catch (err) {
    console.error('[getTranslationSiblings]', err);
  }

  return [];
}
