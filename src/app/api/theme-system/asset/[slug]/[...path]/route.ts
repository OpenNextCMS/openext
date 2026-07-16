import { AssetController } from '@/modules/themeSystem/controllers/AssetController';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/theme-system/asset/:slug/*path — serve a theme's static asset
 * (screenshot, CSS, fonts, images). Public + cacheable; traversal-safe via the
 * Theme Engine (spec §7, §9).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; path: string[] }> }) {
  return withThemeRoute(async () => {
    const { slug, path } = await params;
    return AssetController.serve(slug, path);
  });
}
