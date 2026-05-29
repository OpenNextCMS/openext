import { NextRequest } from 'next/server';
import type { FilterQuery } from 'mongoose';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import type { PageDocument } from '@/types/index';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { generateUniqueSlug } from '@/lib/api/slug';
import { parsePagination } from '@/lib/api/pagination';
import { resolveStatusFields } from '@/lib/api/blogStatus';
import { calculateReadingTime } from '@/utils/blog';
import { createBlogSchema, listBlogsQuerySchema } from '@/lib/validation/blog';
import type { ContentBlock } from '@/types/index';

/**
 * GET /api/blogs
 * List blog posts (pageType 'blog') with filtering + pagination.
 * Query: ?status=&category=&tag=&search=&page=&limit=&cursor=
 * - page/limit -> offset pagination (meta.total/page/limit/hasMore)
 * - cursor (ISO createdAt) -> keyset pagination for infinite scroll
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { status, category, tag, search } = listBlogsQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      tag: searchParams.get('tag') || undefined,
      search: searchParams.get('search') || undefined,
    });
    const { page, limit, cursor } = parsePagination(searchParams);

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const filter: FilterQuery<PageDocument> = { pageType: 'blog' };
    if (status) filter.status = status;
    if (category) filter.categories = category;
    if (tag) filter.tags = tag;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ pageName: rx }, { excerpt: rx }];
    }

    const sort = { publishedAt: -1 as const, createdAt: -1 as const };
    const populate = [
      { path: 'categories', select: 'name slug' },
      { path: 'tags', select: 'name slug' },
      { path: 'authorId', select: 'name avatar' },
    ];

    if (cursor) {
      // Keyset pagination: items strictly older than the cursor.
      const cursorDate = new Date(cursor);
      const keysetFilter = { ...filter, createdAt: { $lt: cursorDate } };
      const items = await PageModel.find(keysetFilter)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .populate(populate)
        .lean()
        .exec();
      const hasMore = items.length > limit;
      const pageItems = hasMore ? items.slice(0, limit) : items;
      const last = pageItems[pageItems.length - 1] as { createdAt?: Date } | undefined;
      return apiOk(pageItems, {
        meta: {
          limit,
          hasMore,
          nextCursor: hasMore && last?.createdAt ? new Date(last.createdAt).toISOString() : null,
        },
      });
    }

    const [items, total] = await Promise.all([
      PageModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(populate)
        .lean()
        .exec(),
      PageModel.countDocuments(filter),
    ]);

    return apiOk(items, {
      meta: { total, page, limit, hasMore: page * limit < total },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/blogs — create a blog post (admin).
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = createBlogSchema.parse(await req.json());

    const pageDb = await getPageDbConnection();
    const PageModel = getPageModel(pageDb);

    const slug = await generateUniqueSlug(PageModel, body.slug || body.pageName);
    const readingTime = calculateReadingTime((body.contentBlocks as ContentBlock[]) || []);
    const statusFields = resolveStatusFields(body.status ?? 'draft', {
      scheduledAt: body.scheduledAt ?? null,
    });

    const created = await PageModel.create({
      ...body,
      slug,
      pageType: 'blog',
      readingTime,
      ...statusFields,
      createdBy: user.userId,
      modifications: [{ modifiedBy: user.userId, modifiedAt: new Date() }],
    });

    return apiOk(created.toObject(), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
