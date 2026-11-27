import { getUserDbConnection, getUserModel } from '@/utils/db';
import { getAuthUser } from './auth';
import type { IUser } from '@/models/User';
import { ROLE } from '@/lib/rbac/roles';

/**
 * Load the full current-user document from the user DB (the JWT only carries
 * id/email/role). Returns null when there is no authenticated user. Used by the
 * dashboard onboarding gate and the onboarding page.
 */
export async function getCurrentUserFull(): Promise<IUser | null> {
  const auth = await getAuthUser();
  if (!auth?.userId) return null;
  try {
    await getUserDbConnection();
    const User = getUserModel();
    return await User.findById(auth.userId).exec();
  } catch {
    return null;
  }
}

/** True only for SuperAdmin accounts (role 0). */
export function isSuperAdminUser(user: { role?: number | string | null } | null | undefined): boolean {
  if (!user) return false;
  const role = typeof user.role === 'number' ? user.role : Number(user.role);
  return role === ROLE.SUPER_ADMIN;
}

/**
 * Onboarding is SuperAdmin-only: site owners set up the website once.
 * Users created by SuperAdmin (Admin/Editor/Author/custom) skip the wizard.
 */
export function needsOnboarding(user: IUser | null | undefined): boolean {
  if (!user) return false;
  if (!isSuperAdminUser(user)) return false;
  return !user.onboardingCompleted;
}

/** Convenience: has the current user finished the setup wizard (or does not need it)? */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getCurrentUserFull();
  if (!user) return false;
  if (!isSuperAdminUser(user)) return true;
  return Boolean(user.onboardingCompleted);
}
