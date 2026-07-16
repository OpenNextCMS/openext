import { NextRequest } from 'next/server';
import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { readUploadedZip } from '@/modules/themeSystem/http/upload';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** PUT /api/theme-system/update/:slug — update to a newer version (rollback-safe, spec §10). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    const { userId } = await requireThemeAdmin();
    const { slug } = await params;
    const buffer = await readUploadedZip(req);
    const record = await ThemeController.update(slug, buffer, { userId, now: new Date().toISOString() });
    return ok(record);
  });
}
