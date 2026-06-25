import { NextRequest } from 'next/server';
import type { FilterQuery } from 'mongoose';
import { getPageDbConnection, getMenuRedirectHistoryModel } from '@/utils/db';
import type { MenuRedirectHistoryDocument } from '@/types/menu-redirect';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';

/** GET /api/menu-redirect/history?menuItemId=&limit=&cursor= — paginated audit log. */
export async function GET(req: NextRequest) {
  try {
    await guardMenuRedirect('read');
    const { searchParams } = new URL(req.url);
    const menuItemId = searchParams.get('menuItemId') || undefined;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const cursor = searchParams.get('cursor') || undefined;

    const pageDb = await getPageDbConnection();
    const History = getMenuRedirectHistoryModel(pageDb);

    const filter: FilterQuery<MenuRedirectHistoryDocument> = {};
    if (menuItemId) filter.menuItemId = menuItemId;
    if (cursor) filter.createdAt = { $lt: new Date(cursor) };

    const rows = await History.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean()
      .exec();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1] as { createdAt?: Date } | undefined;

    return apiOk(items, {
      meta: {
        limit,
        hasMore,
        nextCursor: hasMore && last?.createdAt ? new Date(last.createdAt).toISOString() : null,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
