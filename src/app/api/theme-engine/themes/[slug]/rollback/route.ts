import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { ThemeEngineError } from '@/modules/themeEngine/errors';

/** POST /api/theme-engine/themes/[slug]/rollback — restore the previous active theme. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const ctx = await guardTheme('activate');
    const { slug } = await params;
    const restoredSlug = await themeManager.rollback(ctx.userId);
    if (slug && restoredSlug !== slug) {
      // Slug param is informational; rollback always targets previousThemeSlug.
    }
    return apiOk({ restoredSlug, message: `Rolled back to "${restoredSlug}".` });
  } catch (err) {
    if (err instanceof ThemeEngineError) {
      return handleApiError(new ApiError(err.message, 400));
    }
    const message = err instanceof Error ? err.message : 'Rollback failed.';
    return handleApiError(new ApiError(message, 400));
  }
}
