import { ThemeAssetController } from '@/modules/theme';
import { ThemeRepository } from '@/modules/theme';
import { apiError, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';

export const dynamic = 'force-dynamic';

/**
 * GET /api/themes/[id]/assets/[...path] — serve package assets by theme id
 * (resolves slug, then delegates to ThemeAssetService).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    await guardTheme('view');
    const { id, path: fileParts } = await params;
    const theme = await ThemeRepository.findById(id);
    if (!theme) return apiError('Theme not found', 404);
    return ThemeAssetController.serveBySlug(theme.slug, fileParts);
  } catch (err) {
    return handleApiError(err);
  }
}
