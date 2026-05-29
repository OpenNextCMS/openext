import { NextRequest } from 'next/server';
import {
  getUserDbConnection,
  getPluginModel,
  getPageDbConnection,
  getMenuRedirectMappingModel,
  getMenuRedirectAnalyticsModel,
  getMenuRedirectHistoryModel,
} from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { getPluginState, invalidatePluginStateCache } from '@/lib/menu-redirect/lifecycle';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/**
 * POST /api/menu-redirect/lifecycle/uninstall — removes the Plugin record.
 * Data policy: SOFT by default (mappings/analytics/history preserved in the page
 * DB, dormant). `?purge=true` hard-deletes all plugin data from the page DB.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const purge = searchParams.get('purge') === 'true';

    await getUserDbConnection();
    const Plugin = getPluginModel();
    await Plugin.deleteOne({
      $or: [{ pluginId: 'menu-redirect' }, { type: 'menu' }, { name: /menu redirect/i }],
    });

    // Record the uninstall BEFORE any hard purge so the event survives a purge.
    await logMenuRedirectHistory({ action: 'plugin-uninstalled', userId: user.userId });

    if (purge) {
      const pageDb = await getPageDbConnection();
      await Promise.all([
        getMenuRedirectMappingModel(pageDb).deleteMany({}),
        getMenuRedirectAnalyticsModel(pageDb).deleteMany({}),
        getMenuRedirectHistoryModel(pageDb).deleteMany({}),
      ]);
    }

    invalidatePluginStateCache();
    return apiOk({ ...(await getPluginState({ fresh: true })), purged: purge });
  } catch (err) {
    return handleApiError(err);
  }
}
