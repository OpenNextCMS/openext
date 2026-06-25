import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';
import { createThemeSchema } from '@/lib/theme/theme-validator';

// Always serve the live theme list — never let the browser cache a stale set
// (e.g. one missing a newly-seeded theme like NeoFlow).
export const dynamic = 'force-dynamic';

/** GET /api/themes — list all themes for the tenant (action: view). */
export async function GET() {
  try {
    await guardTheme('view');
    const themes = await ThemeService.list();
    const res = apiOk(themes, { meta: { total: themes.length, hasMore: false } });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/themes — create a theme (action: create). If `duplicateFrom` is
 * provided, the new theme is a copy of that theme; otherwise it's built from the
 * supplied config.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await guardTheme('create');
    const body = createThemeSchema.parse(await req.json());

    const theme = body.duplicateFrom
      ? await ThemeService.duplicate(tenantId, body.duplicateFrom, userId, body.name)
      : await ThemeService.create(
          tenantId,
          {
            name: body.name,
            description: body.description,
            theme: body.theme,
            componentVariants: body.componentVariants,
            previewImage: body.previewImage,
          },
          userId
        );

    return apiOk(theme, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
