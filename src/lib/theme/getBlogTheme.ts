import { getPageDbConnection, getThemeSettingsModel } from '@/utils/db';
import { mergeTheme } from './cssVars';
import type { IBlogThemeSettings } from '@/types/index';

/** Read the tenant's blog theme settings server-side (merged with defaults). */
export async function getBlogTheme(): Promise<IBlogThemeSettings> {
  try {
    const pageDb = await getPageDbConnection();
    const Model = getThemeSettingsModel(pageDb);
    const doc = await Model.findOne({}).lean().exec();
    return mergeTheme(doc as Partial<IBlogThemeSettings> | null);
  } catch {
    return mergeTheme(null);
  }
}
