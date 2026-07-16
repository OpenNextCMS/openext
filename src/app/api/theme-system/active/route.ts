import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';

/** GET /api/theme-system/active — the currently active theme (spec §9). */
export async function GET() {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    return ok(await ThemeController.active());
  });
}
