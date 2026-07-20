import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';

/** POST /api/theme-system/activate/:slug — make one theme active (spec §6, §9). */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    return ok(await ThemeController.activate(slug));
  });
}
