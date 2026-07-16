import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { ThemeEngineError } from '@/modules/themeEngine/errors';

/** POST /api/theme-engine/themes/[slug]/activate */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const ctx = await guardTheme('activate');
    const { slug } = await params;
    await themeManager.activate(slug, ctx.userId);
    return apiOk({ activatedSlug: slug });
  } catch (err) {
    if (err instanceof ThemeEngineError) {
      const status = err.code === 'THEME_NOT_FOUND' ? 404 : 400;
      return handleApiError(new ApiError(err.message, status));
    }
    return handleApiError(err);
  }
}
