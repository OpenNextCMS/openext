import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { flattenSettingsSchema, defaultsFromSettingsSchema } from '@/modules/themeEngine/settingsSchema';
import { ThemeNotFoundError } from '@/modules/themeEngine/errors';

/** GET /api/theme-engine/themes/[slug]/settings — customizer schema */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await guardTheme('view');
    const { slug } = await params;
    const theme = await themeManager.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);

    return apiOk({
      themeSlug: slug,
      schema: flattenSettingsSchema(theme.manifest),
      defaults: defaultsFromSettingsSchema(theme.manifest),
    });
  } catch (err) {
    if (err instanceof ThemeNotFoundError) {
      return handleApiError(new ApiError(err.message, 404));
    }
    return handleApiError(err);
  }
}
