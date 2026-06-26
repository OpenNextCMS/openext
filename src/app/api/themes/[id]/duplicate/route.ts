import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';

/** POST /api/themes/[id]/duplicate — copy a theme into a new editable one. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId, userId } = await guardTheme('duplicate');
    const { id } = await params;
    let name: string | undefined;
    try {
      const body = (await req.json()) as { name?: string } | null;
      name = body?.name;
    } catch {
      // no body — use the default "(Copy)" name
    }
    const theme = await ThemeService.duplicate(tenantId, id, userId, name);
    return apiOk(theme, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
