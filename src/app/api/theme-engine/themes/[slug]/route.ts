import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { ThemeEngineError } from '@/modules/themeEngine/errors';

/** DELETE /api/theme-engine/themes/[slug] — uninstall a Theme Engine package. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await guardTheme('delete');
    const { slug } = await params;
    await themeManager.remove(slug);
    return apiOk({ deletedSlug: slug });
  } catch (err) {
    if (err instanceof ThemeEngineError) {
      const status =
        err.code === 'THEME_NOT_FOUND' ? 404 : err.code === 'THEME_ACTIVE_LOCKED' ? 409 : 400;
      return handleApiError(new ApiError(err.message, status));
    }
    return handleApiError(err);
  }
}
