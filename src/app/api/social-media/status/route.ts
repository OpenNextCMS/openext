import { apiOk, handleApiError } from '@/lib/api/response';
import { requireCapability } from '@/lib/rbac';
import { getSocialMediaPluginState } from '@/lib/social-media/lifecycle';

/** GET /api/social-media/status — install/enable state for UI gates. */
export async function GET() {
  try {
    await requireCapability('plugins.use');
    const state = await getSocialMediaPluginState({ fresh: true });
    return apiOk(state);
  } catch (err) {
    return handleApiError(err);
  }
}
