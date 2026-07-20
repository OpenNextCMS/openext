import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { getPluginState, invalidatePluginStateCache } from '@/lib/menu-redirect/lifecycle';
import { logMenuRedirectHistory } from '@/lib/menu-redirect/history';
import {
  MENU_REDIRECT_PLUGIN_ID,
  MENU_REDIRECT_VERSION,
  MENU_REDIRECT_PLUGIN_DEFAULTS,
} from '@/lib/menu-redirect/constants';

/**
 * POST /api/menu-redirect/lifecycle/install — idempotent install (installed+enabled).
 * Owner/Admin only (role check wired in Phase 2). Reuses the Plugin marketplace record.
 */
export async function POST() {
  try {
    const user = await requireAuth();
    await getUserDbConnection();
    const Plugin = getPluginModel();

    // Tolerant match so a prior marketplace install (e.g. "market-8", type
    // "menu") is reused instead of creating a duplicate record.
    const existing = await Plugin.findOne({
      $or: [
        { pluginId: MENU_REDIRECT_PLUGIN_ID },
        { pluginId: { $regex: 'menu-redirect', $options: 'i' } },
        { name: { $regex: 'menu redirect', $options: 'i' } },
        { type: 'menu' },
      ],
    });
    if (existing) {
      // Idempotent: ensure enabled.
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
    } else {
      await Plugin.create({
        pluginId: MENU_REDIRECT_PLUGIN_ID,
        name: MENU_REDIRECT_PLUGIN_DEFAULTS.name,
        version: MENU_REDIRECT_VERSION,
        description: MENU_REDIRECT_PLUGIN_DEFAULTS.description,
        author: MENU_REDIRECT_PLUGIN_DEFAULTS.author,
        type: MENU_REDIRECT_PLUGIN_DEFAULTS.type,
        icon: MENU_REDIRECT_PLUGIN_DEFAULTS.icon,
        isActive: true,
      });
    }

    invalidatePluginStateCache();
    await logMenuRedirectHistory({ action: 'plugin-installed', userId: user.userId });
    return apiOk(await getPluginState({ fresh: true }), { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
