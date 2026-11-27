import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { requireMinRole, ROLE } from '@/lib/rbac';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';

/**
 * Autosave store for the in-progress setup wizard (SuperAdmin only).
 * The draft is kept in the same WebsitePreferences record (draft:true) so a
 * partially-filled wizard can be resumed after a reload. Once generation runs,
 * the record is finalized (draft:false) and these routes leave it alone.
 */

const draftSchema = z.object({
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  businessDescription: z.string().optional(),
  location: z.string().optional(),
  websiteType: z.string().optional(),
  headerTemplate: z.string().optional(),
  footerTemplate: z.string().optional(),
  theme: z.string().optional(),
});

/** GET /api/onboarding/draft — load the saved draft (or null). */
export async function GET() {
  try {
    const auth = await requireMinRole(ROLE.SUPER_ADMIN);
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);
    const doc = await Prefs.findOne({ userId: auth.user.userId }).lean().exec();
    return apiOk(doc && doc.draft ? doc : null);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH /api/onboarding/draft — upsert the wizard draft. */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireMinRole(ROLE.SUPER_ADMIN);
    const patch = draftSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);

    // Never clobber a finalized record with autosave writes.
    const userId = auth.user.userId;
    const existing = await Prefs.findOne({ userId }).exec();
    if (existing && existing.onboardingCompleted && !existing.draft) {
      return apiOk({ saved: false, finalized: true });
    }

    await Prefs.findOneAndUpdate(
      { userId },
      { $set: { ...patch, userId, draft: true } },
      { upsert: true, new: true }
    ).exec();
    return apiOk({ saved: true });
  } catch (err) {
    return handleApiError(err);
  }
}
