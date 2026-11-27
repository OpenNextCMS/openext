import { NextRequest } from 'next/server';
import {
  getUserDbConnection,
  getPageDbConnection,
  getUserModel,
  getPageModel,
  getBlogPostModel,
  getPluginModel,
  getFormModel,
  getFormSubmissionModel,
  getCommentModel,
  getAnalyticsEventModel,
  getCategoryModel,
} from '@/utils/db';
import { requireCapability } from '@/lib/rbac';
import { apiOk, handleApiError } from '@/lib/api/response';

type Range = '7d' | '30d' | 'all';

function startDateFor(range: Range): Date {
  if (range === 'all') return new Date(0);
  const days = range === '30d' ? 30 : 7;
  return new Date(Date.now() - days * 86_400_000);
}

function parseRange(raw: string | null): Range {
  if (raw === '30d' || raw === 'all') return raw;
  return '7d';
}

/**
 * GET /api/dashboard/overview?range=7d|30d|all
 * CMS-wide stats for dashboard Overview / Analytics / Reports tabs.
 */
export async function GET(req: NextRequest) {
  try {
    await requireCapability('dashboard.view');

    const range = parseRange(new URL(req.url).searchParams.get('range'));
    const since = startDateFor(range);

    await getUserDbConnection();
    const pageDb = await getPageDbConnection();

    const User = getUserModel();
    const Page = getPageModel(pageDb);
    const BlogPost = getBlogPostModel(pageDb);
    const Plugin = getPluginModel();
    const Form = getFormModel(pageDb);
    const FormSubmission = getFormSubmissionModel(pageDb);
    const Comment = getCommentModel(pageDb);
    const Analytics = getAnalyticsEventModel(pageDb);
    const Category = getCategoryModel(pageDb);

    const [
      totalUsers,
      activeUsers,
      totalPages,
      publishedPages,
      totalBlogs,
      publishedBlogs,
      totalPlugins,
      activePlugins,
      totalForms,
      totalSubmissions,
      totalComments,
      recentUsers,
      recentPages,
      recentBlogs,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ active: true }),
      Page.countDocuments({}),
      Page.countDocuments({ isPublished: true }),
      BlogPost.countDocuments({}),
      BlogPost.countDocuments({ isPublished: true }),
      Plugin.countDocuments({}),
      Plugin.countDocuments({ isActive: true }),
      Form.countDocuments({}).catch(() => 0),
      FormSubmission.countDocuments({}).catch(() => 0),
      Comment.countDocuments({}).catch(() => 0),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .select('username email role active createdAt')
        .lean()
        .exec()
        .catch(() => []),
      Page.find({})
        .sort({ updatedAt: -1 })
        .limit(8)
        .select('pageName slug isPublished isHome updatedAt createdAt')
        .lean()
        .exec()
        .catch(() => []),
      BlogPost.find({})
        .sort({ updatedAt: -1 })
        .limit(8)
        .select('pageName slug isPublished status updatedAt createdAt')
        .lean()
        .exec()
        .catch(() => []),
    ]);

    const match = { createdAt: { $gte: since } };
    let traffic = {
      views: 0,
      uniqueVisitors: 0,
      avgReadTime: 0,
      viewsByDay: [] as { date: string; views: number }[],
      popularPosts: [] as { id: string; title: string; slug?: string; views: number }[],
      searches: 0,
    };

    try {
      const [views, visitorIds, avgRead, viewsByDay, popular, searchCount] = await Promise.all([
        Analytics.countDocuments({ ...match, type: 'view' }),
        Analytics.distinct('visitorId', match),
        Analytics.aggregate([
          { $match: { ...match, type: 'read', durationSec: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$durationSec' } } },
        ]),
        Analytics.aggregate([
          { $match: { ...match, type: 'view' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Analytics.aggregate([
          { $match: { ...match, type: 'view', blogId: { $ne: null } } },
          { $group: { _id: '$blogId', views: { $sum: 1 } } },
          { $sort: { views: -1 } },
          { $limit: 8 },
        ]),
        Analytics.countDocuments({ ...match, type: 'search' }),
      ]);

      const popularIds = (popular as { _id: unknown; views: number }[]).map((p) => p._id);
      const posts = await Page.find({ _id: { $in: popularIds } })
        .select('pageName slug')
        .lean()
        .exec()
        .catch(() => []);
      const postMap = new Map(
        (posts as { _id: unknown; pageName?: string; slug?: string }[]).map((p) => [
          String(p._id),
          p,
        ])
      );

      traffic = {
        views: Number(views) || 0,
        uniqueVisitors: ((visitorIds as unknown[]) || []).filter(Boolean).length,
        avgReadTime: Math.round((avgRead as { avg?: number }[])[0]?.avg ?? 0),
        viewsByDay: ((viewsByDay as { _id: string; count: number }[]) || []).map((d) => ({
          date: d._id,
          views: d.count,
        })),
        popularPosts: ((popular as { _id: unknown; views: number }[]) || []).map((p) => {
          const post = postMap.get(String(p._id));
          return {
            id: String(p._id),
            views: p.views,
            title: post?.pageName ?? 'Unknown',
            slug: post?.slug,
          };
        }),
        searches: Number(searchCount) || 0,
      };
    } catch (err) {
      console.warn('[dashboard/overview] traffic aggregates unavailable:', err);
    }

    // Fill missing days for chart smoothness (7d / 30d)
    if (range !== 'all' && traffic.viewsByDay.length >= 0) {
      const days = range === '30d' ? 30 : 7;
      const byDate = new Map(traffic.viewsByDay.map((d) => [d.date, d.views]));
      const filled: { date: string; views: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86_400_000);
        const key = d.toISOString().slice(0, 10);
        filled.push({ date: key, views: byDate.get(key) ?? 0 });
      }
      traffic.viewsByDay = filled;
    }

    const categoryCount = await Category.countDocuments({}).catch(() => 0);

    const contentBreakdown = [
      { name: 'Pages', count: totalPages, published: publishedPages },
      { name: 'Blog posts', count: totalBlogs, published: publishedBlogs },
      { name: 'Plugins', count: totalPlugins, published: activePlugins },
      { name: 'Forms', count: totalForms, published: totalForms },
      { name: 'Comments', count: totalComments, published: totalComments },
      { name: 'Categories', count: categoryCount, published: categoryCount },
    ];

    const publishedRatio =
      totalPages + totalBlogs > 0
        ? Math.round(((publishedPages + publishedBlogs) / (totalPages + totalBlogs)) * 100)
        : 0;

    const serializeUser = (u: Record<string, unknown>) => ({
      id: String(u._id),
      username: String(u.username ?? ''),
      email: String(u.email ?? ''),
      role: u.role,
      active: Boolean(u.active),
      createdAt: u.createdAt ? new Date(u.createdAt as string | Date).toISOString() : null,
    });

    const serializePage = (p: Record<string, unknown>) => ({
      id: String(p._id),
      name: String(p.pageName ?? 'Untitled'),
      slug: String(p.slug ?? ''),
      isPublished: Boolean(p.isPublished),
      isHome: Boolean(p.isHome),
      updatedAt: p.updatedAt ? new Date(p.updatedAt as string | Date).toISOString() : null,
      createdAt: p.createdAt ? new Date(p.createdAt as string | Date).toISOString() : null,
    });

    return apiOk({
      range,
      generatedAt: new Date().toISOString(),
      overview: {
        totalUsers,
        activeUsers,
        totalPages,
        publishedPages,
        totalBlogs,
        publishedBlogs,
        totalPlugins,
        activePlugins,
        totalForms,
        totalSubmissions,
        totalComments,
        publishedRatio,
      },
      contentBreakdown,
      traffic,
      recent: {
        users: (recentUsers as Record<string, unknown>[]).map(serializeUser),
        pages: (recentPages as Record<string, unknown>[]).map(serializePage),
        blogs: (recentBlogs as Record<string, unknown>[]).map(serializePage),
      },
      reports: {
        users: await User.find({})
          .sort({ createdAt: -1 })
          .limit(500)
          .select('username email role active createdAt')
          .lean()
          .exec()
          .then((rows) => (rows as Record<string, unknown>[]).map(serializeUser))
          .catch(() => []),
        pages: await Page.find({})
          .sort({ updatedAt: -1 })
          .limit(500)
          .select('pageName slug isPublished isHome updatedAt createdAt')
          .lean()
          .exec()
          .then((rows) => (rows as Record<string, unknown>[]).map(serializePage))
          .catch(() => []),
        blogs: await BlogPost.find({})
          .sort({ updatedAt: -1 })
          .limit(500)
          .select('pageName slug isPublished status updatedAt createdAt')
          .lean()
          .exec()
          .then((rows) => (rows as Record<string, unknown>[]).map(serializePage))
          .catch(() => []),
        plugins: await Plugin.find({})
          .sort({ createdAt: -1 })
          .limit(200)
          .select('pluginId name version isActive source kind createdAt')
          .lean()
          .exec()
          .then((rows) =>
            (rows as Record<string, unknown>[]).map((p) => ({
              pluginId: String(p.pluginId ?? ''),
              name: String(p.name ?? ''),
              version: String(p.version ?? ''),
              isActive: Boolean(p.isActive),
              source: String(p.source ?? ''),
              kind: String(p.kind ?? ''),
              createdAt: p.createdAt
                ? new Date(p.createdAt as string | Date).toISOString()
                : null,
            }))
          )
          .catch(() => []),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
