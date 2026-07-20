import { getAuthUser } from '@/lib/api/auth';
import { PermissionDeniedError } from '../errors';

/**
 * requireThemeAdmin — authorization middleware for theme management (spec §5:
 * uploads/installs are admin-only). Reuses the CMS's existing session so there's
 * one auth source. Roles: SuperAdmin(0)/Admin(1) — or string owner/super/admin —
 * may manage themes. (Matches the CMS's existing "default to admin when no role
 * claim" behavior so integration doesn't lock out legacy tokens.)
 */
export async function requireThemeAdmin(): Promise<{ userId?: string }> {
  const user = await getAuthUser();
  if (!user) throw new PermissionDeniedError('Authentication required.');

  const role = user.role;
  if (role === undefined || role === null) return { userId: user.userId }; // no claim → allow (legacy)

  const isAdmin =
    typeof role === 'number'
      ? role <= 1
      : typeof role === 'string'
        ? /owner|super|admin/i.test(role)
        : false;

  if (!isAdmin) throw new PermissionDeniedError();
  return { userId: user.userId };
}
