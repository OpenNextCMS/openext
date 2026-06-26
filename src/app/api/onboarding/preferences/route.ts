import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireAuth } from '@/lib/api/auth';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';

/**
 * Read/update the finalized Website Setup preferences for the current user.
 *
 * Unlike `/api/onboarding/draft` (which only exposes in-progress drafts), this
 * route also returns/updates the record once onboarding is completed — used by
 * the Themes gallery to surface and re-pick the design chosen during setup.
 */

const patchSchema = z.object({
  theme: z.string().min(1),
});

/** GET /api/onboarding/preferences — the saved setup choices (or null). */
export async function GET() {
  try {
    const auth = await requireAuth();
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);
    const doc = await Prefs.findOne({ userId: auth.userId })
      .lean<{
        theme?: string;
        websiteType?: string;
        headerTemplate?: string;
        footerTemplate?: string;
        onboardingCompleted?: boolean;
        homepageSlug?: string;
      }>()
      .exec();
    if (!doc) return apiOk(null);
    return apiOk({
      theme: doc.theme || '',
      websiteType: doc.websiteType || '',
      headerTemplate: doc.headerTemplate || '',
      footerTemplate: doc.footerTemplate || '',
      onboardingCompleted: !!doc.onboardingCompleted,
      homepageSlug: doc.homepageSlug || '',
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH /api/onboarding/preferences — update the chosen design style. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { theme } = patchSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);

    await Prefs.findOneAndUpdate(
      { userId: auth.userId },
      { $set: { theme, userId: auth.userId } },
      { upsert: true, new: true }
    ).exec();
    return apiOk({ saved: true });
  } catch (err) {
    return handleApiError(err);
  }
}
