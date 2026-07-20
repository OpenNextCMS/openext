import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import {
  getPluginState,
  invalidatePluginStateCache,
  requirePluginInstalled,
} from '@/lib/menu-redirect/lifecycle';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';

/** POST /api/menu-redirect/lifecycle/disable — mappings preserved but dormant. */
export async function POST() {
  try {
    const user = await requireAuth();
    await requirePluginInstalled();
    await getUserDbConnection();
    const Plugin = getPluginModel();
    await Plugin.updateOne(
      { $or: [{ pluginId: 'menu-redirect' }, { type: 'menu' }, { name: /menu redirect/i }] },
      { $set: { isActive: false } }
    );
    invalidatePluginStateCache();
    await logMenuRedirectHistory({ action: 'plugin-disabled', userId: user.userId });
    return apiOk(await getPluginState({ fresh: true }));
  } catch (err) {
    return handleApiError(err);
  }
}
