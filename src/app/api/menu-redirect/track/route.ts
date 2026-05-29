import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel, getMenuRedirectAnalyticsModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requirePluginActive } from '@/lib/menu-redirect/lifecycle';

/**
 * POST /api/menu-redirect/track — PUBLIC click beacon ({ mappingId }).
 * requirePluginActive runs FIRST: if the plugin is disabled, this returns 409
 * and the click isn't tracked (links fall back to default behavior).
 */
export async function POST(req: NextRequest) {
  try {
    await requirePluginActive();
    const { mappingId } = (await req.json()) as { mappingId?: string };
    if (!mappingId) return apiOk({ ok: false });

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);
    const Analytics = getMenuRedirectAnalyticsModel(pageDb);

    const mapping = await Mapping.findById(mappingId).select('menuItemId targetId').lean();
    if (!mapping) return apiOk({ ok: false });

    await Analytics.findOneAndUpdate(
      { mappingId },
      {
        $inc: { clicks: 1 },
        $set: {
          lastClickedAt: new Date(),
          menuItemId: (mapping as { menuItemId?: string }).menuItemId,
          targetId: (mapping as { targetId?: string }).targetId,
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return apiOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
