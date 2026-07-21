import { ThemeAssetController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/**
 * GET /theme-assets/[theme]/[...file] — public asset pipeline for theme packages.
 * Never exposes filesystem paths; only serves from storage/themes/{slug}.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ theme: string; file: string[] }> }
) {
  const { theme, file } = await params;
  return ThemeAssetController.serveBySlug(theme, file);
}
