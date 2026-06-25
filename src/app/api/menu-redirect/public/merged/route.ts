import { NextRequest } from 'next/server';
import { getPageDbConnection, getMenuRedirectMappingModel } from '@/utils/db';
import { apiOk, handleApiError } from '@/lib/api/response';
import { getPluginState } from '@/lib/menu-redirect/lifecycle';
import { resolveActiveHeader } from '@/lib/menu-redirect/header-detection';

/**
 * GET /api/menu-redirect/public/merged?headerId= — PUBLIC.
 * Returns per-menuItemId redirect directives for the runtime navbar.
 * When the plugin is not active it returns { active:false } so the published
 * header falls back to its default links (never errors).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const headerId = searchParams.get('headerId') || undefined;

    const state = await getPluginState();
    if (!state.installed || !state.enabled) {
      return apiOk({ active: false, directives: {} });
    }

    const resolved = await resolveActiveHeader({ headerId });
    if (!('headerId' in resolved)) {
      return apiOk({ active: true, directives: {} });
    }

    const pageDb = await getPageDbConnection();
    const Mapping = getMenuRedirectMappingModel(pageDb);
    const mappings = await Mapping.find({ headerId: resolved.headerId }).lean().exec();

    const directives: Record<string, unknown> = {};
    for (const m of mappings) {
      const map = m as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      directives[map.menuItemId] = {
        mappingId: String(map._id),
        href: map.targetUrl || '',
        openInNewTab: !!map.openInNewTab,
        nofollow: !!map.nofollow,
        enabled: map.enabled !== false,
        customClass: map.customClass,
        dataAttributes: map.dataAttributes || {},
        trackClicks: !!map.trackClicks,
      };
    }

    return apiOk({ active: true, headerId: resolved.headerId, directives });
  } catch (err) {
    return handleApiError(err);
  }
}
