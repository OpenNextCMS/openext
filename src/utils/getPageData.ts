import { getPageDbConnection, getPageModel } from '@/utils/db';
import type { BlockData } from '@/types/index';
import { DEFAULT_SITE_LOCALE } from '@/lib/i18n/siteLanguages';

interface PageDoc {
  _id?: string;
  pageName: string;
  pageType: 'page' | 'header' | 'footer';
  isPublished?: boolean;
  isGlobal?: boolean;
  isHome?: boolean;
  component?: BlockData[];
  createdBy?: unknown;
  updatedAt?: Date;
  description?: string;
  slug?: string;
  seoName?: string;
  seoMeta?: string;
  locale?: string;
  translationGroupId?: string;
}

export interface PageDataResult {
  page: PageDoc | null;
  header: PageDoc | null;
  footer: PageDoc | null;
}

export type PageLookupOptions = {
  /**
   * When true, never return a page from a different locale.
   * Used for multilingual sites so language switching cannot silently show English.
   */
  strictLocale?: boolean;
  /**
   * When true (default for public site), only return published pages/headers/footers.
   * Set false only for authenticated editor/admin preview paths.
   */
  publishedOnly?: boolean;
};

function withPublishedFilter(
  filter: Record<string, unknown>,
  publishedOnly: boolean
): Record<string, unknown> {
  if (!publishedOnly) return filter;
  return { ...filter, isPublished: true };
}

/**
 * Page.component is always stored as BlockData[], but some seed/repair paths
 * historically wrote a single root block object. Normalize so public render
 * does not treat those pages as missing.
 */
function asBlockArray(component: unknown): BlockData[] | null {
  if (Array.isArray(component)) return component as BlockData[];
  if (component && typeof component === 'object') return [component as BlockData];
  return null;
}

async function findPageBySlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PageModel: any,
  slug: string,
  locale?: string,
  options?: PageLookupOptions
): Promise<PageDoc | null> {
  const preferred = locale || DEFAULT_SITE_LOCALE;
  const strict = !!options?.strictLocale;
  const publishedOnly = options?.publishedOnly !== false;

  const exact = (await PageModel.findOne(
    withPublishedFilter({ slug, locale: preferred }, publishedOnly)
  )
    .select('-modifications')
    .lean()
    .exec()) as PageDoc | null;
  if (exact) return exact;

  if (strict) {
    // Allow legacy docs that never got a locale field only when requesting the default locale.
    if (preferred === DEFAULT_SITE_LOCALE) {
      const legacy = (await PageModel.findOne(
        withPublishedFilter(
          {
            slug,
            $or: [{ locale: { $exists: false } }, { locale: null }, { locale: '' }],
          },
          publishedOnly
        )
      )
        .select('-modifications')
        .lean()
        .exec()) as PageDoc | null;
      if (legacy) return legacy;
    }
    return null;
  }

  // Legacy pages created before multilingual support (no locale field).
  const legacy = (await PageModel.findOne(
    withPublishedFilter(
      {
        slug,
        $or: [{ locale: { $exists: false } }, { locale: null }, { locale: '' }],
      },
      publishedOnly
    )
  )
    .select('-modifications')
    .lean()
    .exec()) as PageDoc | null;
  if (legacy) return legacy;

  // Last resort: any locale with this slug (single-language sites).
  return (await PageModel.findOne(withPublishedFilter({ slug }, publishedOnly))
    .select('-modifications')
    .lean()
    .exec()) as PageDoc | null;
}

export async function fetchPageWithLayout(
  slug: string,
  locale?: string,
  options?: PageLookupOptions
): Promise<PageDataResult | null> {
  try {
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const page = await findPageBySlug(PageModel, slug, locale, options);
    if (!page) return null;

    const isLayoutPart = page.pageType === 'header' || page.pageType === 'footer';
    if (isLayoutPart) {
      return { page, header: null, footer: null };
    }

    // OpenExt default_home embeds its own fixed header + footer in page blocks.
    // Skip global CMS chrome so the classic OpenNext look is not stacked with
    // site header/footer (which caused dual footers / mismatched branding).
    if (page.slug === 'default_home') {
      return { page, header: null, footer: null };
    }

    // A Theme Engine frame renders its package Header + Template + Footer in
    // one exact surface. Never resolve active CMS chrome around that page or
    // the user would see two headers/footers.
    const pageBlocks = asBlockArray(page.component);
    const usesThemeEngineChrome =
      !!pageBlocks && pageBlocks.some((block) => block?.type === 'theme-engine-frame');
    if (usesThemeEngineChrome) {
      return { page, header: null, footer: null };
    }

    const activeLayoutFilter = { isGlobal: true, isPublished: true };
    const preferred = locale || page.locale || DEFAULT_SITE_LOCALE;

    const findActiveLayoutPart = async (
      pageType: 'header' | 'footer'
    ): Promise<PageDoc | null> => {
      if (page.createdBy) {
        const ownedLocale = (await PageModel.findOne({
          ...activeLayoutFilter,
          pageType,
          createdBy: page.createdBy,
          locale: preferred,
        })
          .select('-modifications')
          .sort({ updatedAt: -1 })
          .lean()
          .exec()) as PageDoc | null;
        if (ownedLocale) return ownedLocale;

        if (!options?.strictLocale) {
          const owned = (await PageModel.findOne({
            ...activeLayoutFilter,
            pageType,
            createdBy: page.createdBy,
          })
            .select('-modifications')
            .sort({ updatedAt: -1 })
            .lean()
            .exec()) as PageDoc | null;
          if (owned) return owned;
        }
      }

      const globalLocale = (await PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
        locale: preferred,
      })
        .select('-modifications')
        .sort({ updatedAt: -1 })
        .lean()
        .exec()) as PageDoc | null;
      if (globalLocale) return globalLocale;

      if (options?.strictLocale) return null;

      const globalPart = (await PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
      })
        .select('-modifications')
        .sort({ updatedAt: -1 })
        .lean()
        .exec()) as PageDoc | null;
      if (globalPart) return globalPart;

      return (await PageModel.findOne({
        pageType,
        isPublished: true,
      })
        .select('-modifications')
        .sort({ updatedAt: -1 })
        .lean()
        .exec()) as PageDoc | null;
    };

    const [header, footer] = await Promise.all([
      findActiveLayoutPart('header'),
      findActiveLayoutPart('footer'),
    ]);

    return { page, header, footer };
  } catch (err) {
    console.error('Error fetching page data:', err);
    return null;
  }
}

/** Fetch only the active header/footer for the public chrome (no page required). */
export async function fetchActiveGlobalLayout(locale?: string): Promise<{
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
}> {
  try {
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);
    const preferred = locale || DEFAULT_SITE_LOCALE;
    const activeLayoutFilter = { isGlobal: true, isPublished: true };

    const findPart = async (pageType: 'header' | 'footer') => {
      const withLocale = (await PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
        locale: preferred,
      })
        .sort({ updatedAt: -1 })
        .lean()
        .exec()) as PageDoc | null;
      if (withLocale) return withLocale;

      return (await PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
      })
        .sort({ updatedAt: -1 })
        .lean()
        .exec()) as PageDoc | null;
    };

    const [header, footer] = await Promise.all([findPart('header'), findPart('footer')]);
    return {
      headerBlocks: asBlockArray(header?.component) ?? [],
      footerBlocks: asBlockArray(footer?.component) ?? [],
    };
  } catch (err) {
    console.error('Error fetching global layout blocks:', err);
    return { headerBlocks: [], footerBlocks: [] };
  }
}

/** @deprecated Prefer fetchActiveGlobalLayout(locale) */
export async function getGlobalLayoutBlocks(locale?: string): Promise<{
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
}> {
  return fetchActiveGlobalLayout(locale);
}

export async function getPageDataForSlug(
  slug: string,
  locale?: string,
  options?: PageLookupOptions
): Promise<{
  blocks: BlockData[];
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
  metadata: Partial<PageDoc>;
} | null> {
  const data = await fetchPageWithLayout(slug, locale, options);
  const blocks = asBlockArray(data?.page?.component);
  if (!data?.page || !blocks) return null;

  const isLayoutPart =
    data.page.pageType === 'header' || data.page.pageType === 'footer';

  const { component: _component, ...metadata } = data.page;

  return {
    blocks,
    metadata,
    headerBlocks: !isLayoutPart ? asBlockArray(data.header?.component) ?? [] : [],
    footerBlocks: !isLayoutPart ? asBlockArray(data.footer?.component) ?? [] : [],
  };
}
