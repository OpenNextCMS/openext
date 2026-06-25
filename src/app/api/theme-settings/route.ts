import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPageDbConnection, getThemeSettingsModel } from '@/utils/db';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { themeSettingsSchema } from '@/lib/validation/theme';
import { mergeTheme } from '@/lib/theme/cssVars';
import type { IBlogThemeSettings } from '@/types/index';

/** GET /api/theme-settings — current blog theme (public, merged with defaults). */
export async function GET() {
  try {
    const pageDb = await getPageDbConnection();
    const Model = getThemeSettingsModel(pageDb);
    const doc = await Model.findOne({}).lean().exec();
    return apiOk(mergeTheme(doc as Partial<IBlogThemeSettings> | null));
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/theme-settings — upsert the single theme document (admin). */
export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = themeSettingsSchema.parse(await req.json());
    const pageDb = await getPageDbConnection();
    const Model = getThemeSettingsModel(pageDb);

    const updated = await Model.findOneAndUpdate(
      {},
      { $set: body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    try {
      revalidatePath('/blogs');
    } catch (e) {
      console.warn('revalidate failed', e);
    }
    return apiOk(mergeTheme(updated as Partial<IBlogThemeSettings> | null));
  } catch (err) {
    return handleApiError(err);
  }
}
