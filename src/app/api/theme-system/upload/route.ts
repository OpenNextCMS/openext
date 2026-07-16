import { NextRequest } from 'next/server';
import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { readUploadedZip } from '@/modules/themeSystem/http/upload';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';

export const dynamic = 'force-dynamic';
// Allow large uploads without Next buffering to a small default.
export const maxDuration = 60;

/** POST /api/theme-system/upload — install a theme from a ZIP (spec §2, §9). */
export async function POST(req: NextRequest) {
  return withThemeRoute(async () => {
    const { userId } = await requireThemeAdmin();
    const buffer = await readUploadedZip(req);
    const record = await ThemeController.upload(buffer, { userId, now: new Date().toISOString() });
    return ok(record, 201);
  });
}
