import { getPageDbConnection, getCategoryModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';
import type { ContentItem } from '@/types/menu-redirect';

/** GET /api/menu-redirect/blog-categories — selectable blog categories. */
export async function GET() {
  try {
    await guardMenuRedirect('read');
    const pageDb = await getPageDbConnection();
    const Category = getCategoryModel(pageDb);
    const cats = await Category.find({}).select('name slug').lean().exec();
    const items: ContentItem[] = cats.map((c) => ({
      targetType: 'blog-category',
      targetId: String((c as { _id: unknown })._id),
      label: (c as { name?: string }).name || 'Category',
      slug: (c as { slug?: string }).slug,
    }));
    return apiOk(items);
  } catch (err) {
    return handleApiError(err);
  }
}
