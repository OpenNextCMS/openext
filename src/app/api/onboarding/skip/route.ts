import { apiOk, handleApiError } from '@/lib/api/response';
import { requireMinRole, ROLE } from '@/lib/rbac';
import { skipOnboarding } from '@/services/skipOnboarding';

/**
 * POST /api/onboarding/skip — SuperAdmin only. Mark onboarding complete without
 * generating a starter website so the site owner can go straight to the dashboard.
 */
export async function POST() {
  try {
    const auth = await requireMinRole(ROLE.SUPER_ADMIN);
    const result = await skipOnboarding(auth.user.userId);
    return apiOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
