import { apiOk, handleApiError } from '@/lib/api/response';
import { getPluginState } from '@/lib/menu-redirect/lifecycle';

/** GET /api/menu-redirect/lifecycle/status — { installed, enabled, version, settings }. */
export async function GET() {
  try {
    const state = await getPluginState({ fresh: true });
    return apiOk(state);
  } catch (err) {
    return handleApiError(err);
  }
}
