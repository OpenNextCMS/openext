import { NextRequest } from 'next/server';
import {
  getPageDbConnection,
  getMenuRedirectAnalyticsModel,
  getMenuRedirectMappingModel,
} from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardMenuRedirect } from '@/lib/menu-redirect/guard';

function startDateFor(range: string): Date {
  if (range === 'all') return new Date(0);
  const days = range === '30d' ? 30 : 7;
  return new Date(Date.now() - days * 86_400_000);
}

/**
 * GET /api/menu-redirect/analytics?range=7d|30d|all — most/least clicked menu
 * items + total clicks. (CTR/impressions aren't tracked, so we report click
 * share as a proxy.)
 */
export async function GET(req: NextRequest) {
  try {
    await guardMenuRedirect('read');
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';
    const since = startDateFor(range);

    const pageDb = await getPageDbConnection();
    const Analytics = getMenuRedirectAnalyticsModel(pageDb);
    const Mapping = getMenuRedirectMappingModel(pageDb);

    const filter = range === 'all' ? {} : { lastClickedAt: { $gte: since } };
    const rows = await Analytics.find(filter).lean().exec();

    const mappingIds = rows.map((r) => (r as { mappingId: unknown }).mappingId);
    const maps = await Mapping.find({ _id: { $in: mappingIds } })
      .select('menuItemId targetUrl targetType')
      .lean()
      .exec();
    const mapById = new Map(maps.map((m) => [String((m as { _id: unknown })._id), m]));

    const items = rows
      .map((r) => {
        const m = mapById.get(String((r as { mappingId: unknown }).mappingId)) as
          | { menuItemId?: string; targetUrl?: string; targetType?: string }
          | undefined;
        return {
          mappingId: String((r as { mappingId: unknown }).mappingId),
          menuItemId: m?.menuItemId ?? (r as { menuItemId?: string }).menuItemId ?? 'unknown',
          targetUrl: m?.targetUrl ?? '',
          targetType: m?.targetType ?? '',
          clicks: (r as { clicks?: number }).clicks ?? 0,
          lastClickedAt: (r as { lastClickedAt?: Date }).lastClickedAt ?? null,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    const totalClicks = items.reduce((sum, i) => sum + i.clicks, 0);
    const withShare = items.map((i) => ({
      ...i,
      share: totalClicks ? Math.round((i.clicks / totalClicks) * 100) : 0,
    }));

    return apiOk({
      range,
      totalClicks,
      mostClicked: withShare.slice(0, 10),
      leastClicked: [...withShare].reverse().slice(0, 10),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
