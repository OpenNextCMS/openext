import { randomUUID } from 'crypto';
import { DEFAULT_SITE_LOCALE, normalizeLocale } from '@/lib/i18n/siteLanguages';

type PageLean = {
  _id: unknown;
  pageName?: string;
  pageType?: string;
  slug?: string;
  locale?: string;
  translationGroupId?: string;
  description?: string;
  preHeading?: string;
  seoName?: string;
  seoMeta?: string;
  component?: unknown[];
  isHome?: boolean;
  isGlobal?: boolean;
  isPublished?: boolean;
};

export type CloneTranslationResult =
  | { status: 'created'; page: unknown }
  | { status: 'exists'; page: unknown }
  | { status: 'skipped'; reason: string };

/**
 * Clone one CMS page/header/footer into `targetLocale`, sharing translationGroupId.
 */
export async function clonePageToLocale(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageModel: any,
  source: PageLean,
  targetLocaleRaw: string,
  userId: string,
  options?: {
    componentOverride?: unknown[];
    publish?: boolean;
    pageNameSuffix?: boolean;
  }
): Promise<CloneTranslationResult> {
  const targetLocale = normalizeLocale(targetLocaleRaw, '');
  const sourceLocale = source.locale || DEFAULT_SITE_LOCALE;

  if (!targetLocale || sourceLocale === targetLocale) {
    return { status: 'skipped', reason: 'same-locale' };
  }

  let groupId = source.translationGroupId;
  if (!groupId) {
    groupId = randomUUID();
    await PageModel.updateOne(
      { _id: source._id },
      { $set: { translationGroupId: groupId, locale: sourceLocale } }
    ).exec();
  }

  const existing = await PageModel.findOne({
    translationGroupId: groupId,
    locale: targetLocale,
  })
    .lean()
    .exec();
  if (existing) {
    return { status: 'exists', page: existing };
  }

  const baseSlug = source.slug || 'page';
  const MAX_ATTEMPTS = 50;
  const component =
    options?.componentOverride ??
    (Array.isArray(source.component) ? structuredClone(source.component) : []);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidateSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const pageNameBase = source.pageName || 'Page';
    const page = new PageModel({
      pageName:
        options?.pageNameSuffix === false
          ? pageNameBase
          : `${pageNameBase} (${targetLocale.toUpperCase()})`,
      pageType: source.pageType || 'page',
      slug: candidateSlug,
      locale: targetLocale,
      translationGroupId: groupId,
      description: source.description,
      preHeading: source.preHeading,
      seoName: source.seoName,
      seoMeta: source.seoMeta,
      component,
      isPublished: options?.publish ? !!source.isPublished : false,
      isHome: !!source.isHome,
      isGlobal: !!source.isGlobal,
      createdBy: userId,
      modifications: [{ modifiedBy: userId, modifiedAt: new Date() }],
    });

    try {
      await page.save();
      if (source.isHome) {
        await PageModel.updateMany(
          {
            pageType: 'page',
            locale: targetLocale,
            isHome: true,
            _id: { $ne: page._id },
          },
          { $set: { isHome: false } }
        ).exec();
      }
      return { status: 'created', page };
    } catch (error) {
      const err = error as { code?: number; keyPattern?: Record<string, unknown> };
      if (err.code === 11000 && err.keyPattern && 'slug' in err.keyPattern) {
        continue;
      }
      throw error;
    }
  }

  return { status: 'skipped', reason: 'slug-conflict' };
}
