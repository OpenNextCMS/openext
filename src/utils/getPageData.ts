import { getPageDbConnection, getPageModel } from '@/utils/db';
import type { BlockData } from '@/types/index';

interface PageDoc {
  _id?: string;
  pageName: string;
  pageType: 'page' | 'header' | 'footer' | 'blog';
  isPublished?: boolean;
  isGlobal?: boolean;
  component?: BlockData[];
  createdBy?: unknown;
  updatedAt?: Date;
  category?: string;
  authorName?: string;
  featuredImage?: string;
  publishDate?: Date;
  description?: string;
}

export interface PageDataResult {
  page: PageDoc | null;
  header: PageDoc | null;
  footer: PageDoc | null;
}

export async function fetchPageWithLayout(slug: string): Promise<PageDataResult | null> {
  try {
    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const page = (await PageModel.findOne({ slug }).lean().exec()) as PageDoc | null;
    if (!page) return null;

    const isLayoutPart = page.pageType === 'header' || page.pageType === 'footer';
    if (isLayoutPart) {
      return { page, header: null, footer: null };
    }

    const activeLayoutFilter = { isGlobal: true, isPublished: true };

    const findActiveLayoutPart = async (
      pageType: 'header' | 'footer'
    ): Promise<PageDoc | null> => {
      if (page.createdBy) {
        const owned = (await PageModel.findOne({
          ...activeLayoutFilter,
          pageType,
          createdBy: page.createdBy,
        })
          .sort({ updatedAt: -1 })
          .lean()
          .exec()) as PageDoc | null;
        if (owned) return owned;
      }

      return (await PageModel.findOne({
        ...activeLayoutFilter,
        pageType,
      })
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

export async function getPageDataForSlug(slug: string): Promise<{
  blocks: BlockData[];
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
  metadata: Partial<PageDoc>;
} | null> {
  const data = await fetchPageWithLayout(slug);
  if (!data?.page || !Array.isArray(data.page.component)) return null;

  const isLayoutPart =
    data.page.pageType === 'header' || data.page.pageType === 'footer';

  const { component, ...metadata } = data.page;

  return {
    blocks: component || [],
    metadata,
    headerBlocks:
      !isLayoutPart && Array.isArray(data.header?.component) ? data.header!.component : [],
    footerBlocks:
      !isLayoutPart && Array.isArray(data.footer?.component) ? data.footer!.component : [],
  };
}
