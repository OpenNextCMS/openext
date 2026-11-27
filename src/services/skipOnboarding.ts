/**
 * skipOnboarding — let the user bypass the setup wizard without generating a
 * starter site. Sets the same User.onboardingCompleted gate the dashboard uses,
 * and finalizes WebsitePreferences so drafts are not left half-open.
 */
import {
  getPageDbConnection,
  getWebsitePreferencesModel,
  getUserDbConnection,
  getUserModel,
} from '@/utils/db';
import { ensureDefaultHomePage } from '@/services/ensureDefaultHomePage';

export interface SkipOnboardingResult {
  skipped: true;
  alreadyCompleted: boolean;
}

export async function skipOnboarding(userId: string): Promise<SkipOnboardingResult> {
  await getUserDbConnection();
  const User = getUserModel();
  const user = await User.findById(userId).select('onboardingCompleted').lean().exec();
  const alreadyCompleted = !!(user as { onboardingCompleted?: boolean } | null)?.onboardingCompleted;

  if (!alreadyCompleted) {
    await User.findByIdAndUpdate(userId, { $set: { onboardingCompleted: true } }).exec();
  }

  try {
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);
    await Prefs.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          onboardingCompleted: true,
          draft: false,
        },
      },
      { upsert: true, new: true }
    ).exec();
  } catch (err) {
    // User flag is the dashboard gate; prefs finalize is best-effort.
    console.warn('Could not finalize WebsitePreferences on skip:', err);
  }

  // Always ensure the OpenExt default homepage exists, even when wizard is skipped.
  try {
    await ensureDefaultHomePage({ createdBy: userId });
  } catch (err) {
    console.warn('Could not ensure default_home on skip:', err);
  }

  return { skipped: true, alreadyCompleted };
}
