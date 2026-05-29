import { NextRequest } from 'next/server';
import {
  getPageDbConnection,
  getAnalyticsEventModel,
  getPageModel,
  getCategoryModel,
} from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { summaryRangeSchema } from '@/lib/validation/analytics';

function startDateFor(range: '7d' | '30d' | 'all'): Date {
  if (range === 'all') return new Date(0);
  const days = range === '30d' ? 30 : 7;
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * GET /api/analytics/summary?range=7d|30d|all — dashboard aggregates (admin).
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const range = summaryRangeSchema.parse(searchParams.get('range') || '7d');
    const since = startDateFor(range);

    const pageDb = await getPageDbConnection();
    const Analytics = getAnalyticsEventModel(pageDb);
    const Page = getPageModel(pageDb);
    const Category = getCategoryModel(pageDb);

    const match = { createdAt: { $gte: since } };

    const [views, visitorIds, avgRead, viewsByDay, popular, searches] = await Promise.all([
      Analytics.countDocuments({ ...match, type: 'view' }),
      Analytics.distinct('visitorId', match),
      Analytics.aggregate([
        { $match: { ...match, type: 'read', durationSec: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$durationSec' } } },
      ]),
      Analytics.aggregate([
        { $match: { ...match, type: 'view' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Analytics.aggregate([
        { $match: { ...match, type: 'view', blogId: { $ne: null } } },
        { $group: { _id: '$blogId', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
      Analytics.aggregate([
        { $match: { ...match, type: 'search', query: { $nin: [null, ''] } } },
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Hydrate popular posts with title/slug/categories.
    const popularIds = (popular as { _id: unknown; views: number }[]).map((p) => p._id);
    const posts = await Page.find({ _id: { $in: popularIds } })
      .select('pageName slug categories')
      .lean()
      .exec();
    const postMap = new Map(posts.map((p) => [String((p as { _id: unknown })._id), p]));

    const popularPosts = (popular as { _id: unknown; views: number }[]).map((p) => {
      const post = postMap.get(String(p._id)) as
        | { pageName?: string; slug?: string }
        | undefined;
      return { id: String(p._id), views: p.views, title: post?.pageName ?? 'Unknown', slug: post?.slug };
    });

    // Tally categories across the top viewed posts.
    const catTally = new Map<string, number>();
    for (const p of popular as { _id: unknown; views: number }[]) {
      const post = postMap.get(String(p._id)) as { categories?: unknown[] } | undefined;
      for (const c of post?.categories ?? []) {
        const key = String(c);
        catTally.set(key, (catTally.get(key) ?? 0) + p.views);
      }
    }
    const catDocs = await Category.find({ _id: { $in: [...catTally.keys()] } })
      .select('name')
      .lean()
      .exec();
    const catNameMap = new Map(catDocs.map((c) => [String((c as { _id: unknown })._id), (c as { name?: string }).name]));
    const topCategories = [...catTally.entries()]
      .map(([id, count]) => ({ name: catNameMap.get(id) ?? 'Uncategorized', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return apiOk({
      range,
      views,
      uniqueVisitors: (visitorIds as unknown[]).filter(Boolean).length,
      avgReadTime: Math.round((avgRead as { avg?: number }[])[0]?.avg ?? 0),
      viewsByDay: (viewsByDay as { _id: string; count: number }[]).map((d) => ({
        date: d._id,
        views: d.count,
      })),
      popularPosts,
      topCategories,
      searchQueries: (searches as { _id: string; count: number }[]).map((s) => ({
        query: s._id,
        count: s.count,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
