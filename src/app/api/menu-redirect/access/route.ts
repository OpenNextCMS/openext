import { apiOk, handleApiError } from '@/lib/api/response';
import { getCurrentRole, can } from '@/lib/menu-redirect/permissions';

/** GET /api/menu-redirect/access — current role + capability flags for the UI. */
export async function GET() {
  try {
    const role = await getCurrentRole();
    return apiOk({
      role,
      canRead: can(role, 'read'),
      canEdit: can(role, 'update'),
      canManageLifecycle: can(role, 'install'),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
