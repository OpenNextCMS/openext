import { apiOk, handleApiError } from '@/lib/api/response';
import { getFormPluginState } from '@/lib/form-builder/lifecycle';
import { getCurrentFormRole } from '@/lib/form-builder/permissions';

/**
 * GET /api/forms/status — plugin install/enable state + the caller's role.
 * Public-ish: used by the client gate and useFormPermissions hook. Returns
 * { installed, enabled } even when inactive so the UI can hide itself.
 */
export async function GET() {
  try {
    const [state, role] = await Promise.all([getFormPluginState(), getCurrentFormRole()]);
    return apiOk({ ...state, role });
  } catch (err) {
    return handleApiError(err);
  }
}
