import { getPageDbConnection, getPageModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import type { ContentItem } from '@/types/menu-redirect';

/** GET /api/menu-redirect/pages — selectable pages for the left panel. */
export async function GET() {
  try {
    await guardMenuRedirect('read');
    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);
    const pages = await Page.find({ pageType: 'page' }).select('pageName slug').lean().exec();
    const items: ContentItem[] = pages.map((p) => ({
      targetType: 'page',
      targetId: String((p as { _id: unknown })._id),
      label: (p as { pageName?: string }).pageName || 'Untitled',
      slug: (p as { slug?: string }).slug,
    }));
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}
