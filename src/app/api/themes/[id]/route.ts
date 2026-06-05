import { NextRequest } from 'next/server';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';
import { updateThemeSchema } from '@/lib/theme/theme-validator';

/** GET /api/themes/[id] — a single theme (action: view). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardTheme('view');
    const { id } = await params;
    const theme = await ThemeService.getById(id);
    if (!theme) return apiError('Theme not found', 404);
    return apiOk(theme);
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/themes/[id] — update a custom theme (action: update). */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardTheme('update');
    const { id } = await params;
    const body = updateThemeSchema.parse(await req.json());
    const theme = await ThemeService.update(id, body);
    return apiOk(theme);
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/themes/[id] — delete a custom theme (action: delete). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardTheme('delete');
    const { id } = await params;
    await ThemeService.delete(id);
    return apiOk({ id, deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
