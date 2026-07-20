import { NextRequest } from 'next/server';
import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';
import { InvalidManifestError } from '@/modules/themeSystem/errors';

export const dynamic = 'force-dynamic';

/** GET /api/theme-system/:slug — theme details for the preview panel (spec §9). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    return ok(await ThemeController.details(slug));
  });
}

/** DELETE /api/theme-system/:slug — remove a theme (active theme is protected, spec §11). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    return ok(await ThemeController.remove(slug));
  });
}

/** PATCH /api/theme-system/:slug — save Theme Options values (auto settings page, §1/§14). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    const body = await req.json().catch(() => {
      throw new InvalidManifestError('Request body must be JSON.');
    });
    const settings = (body as { settings?: Record<string, unknown> }).settings;
    if (!settings || typeof settings !== 'object') {
      throw new InvalidManifestError('Expected a "settings" object.');
    }
    return ok(await ThemeController.updateSettings(slug, settings));
  });
}
