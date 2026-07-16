import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';

/** GET /api/theme-system/:slug/files — editable file tree for the Theme Editor (spec §13). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    return ok(await ThemeController.listFiles(slug));
  });
}
