import { NextRequest } from 'next/server';
import { ThemeController } from '@/modules/themeSystem/controllers/ThemeController';
import { requireThemeAdmin } from '@/modules/themeSystem/http/auth';
import { ok } from '@/modules/themeSystem/http/response';
import { withThemeRoute } from '@/modules/themeSystem/http/handler';
import { InvalidManifestError } from '@/modules/themeSystem/errors';

export const dynamic = 'force-dynamic';

/** GET /api/theme-system/:slug/file?path=... — read a theme file (spec §13). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    const filePath = req.nextUrl.searchParams.get('path');
    if (!filePath) throw new InvalidManifestError('Missing "path" query parameter.');
    return ok(await ThemeController.readFile(slug, filePath));
  });
}

/** PUT /api/theme-system/:slug/file — write a theme file `{ path, content }` (spec §13). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withThemeRoute(async () => {
    await requireThemeAdmin();
    const { slug } = await params;
    const body = (await req.json().catch(() => {
      throw new InvalidManifestError('Request body must be JSON.');
    })) as { path?: string; content?: string };
    if (!body.path || typeof body.content !== 'string') {
      throw new InvalidManifestError('Expected `{ path: string, content: string }`.');
    }
    return ok(await ThemeController.writeFile(slug, body.path, body.content));
  });
}
