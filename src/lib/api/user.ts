import { getUserDbConnection, getUserModel } from '@/utils/db';
import { getAuthUser } from './auth';
import type { IUser } from '@/models/User';

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

/** Convenience: has the current user finished the setup wizard? */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const user = await getCurrentUserFull();
  return Boolean(user?.onboardingCompleted);
}
