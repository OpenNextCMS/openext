import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeEngineEditorApplyService } from '@/modules/themeEngine/ThemeEngineEditorApplyService';

const bodySchema = z.object({
  mode: z.enum(['live-frame', 'editable-blocks', 'exact-editable']).optional(),
});

/**
 * POST /api/theme-engine/themes/[slug]/apply-editor
 * Load the exact theme onto the homepage canvas (with declared editable sections).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await guardTheme('activate');
    const { slug } = await params;
    const json = await req.json().catch(() => ({}));
    bodySchema.parse(json ?? {});
    const applied = await ThemeEngineEditorApplyService.applyToHomepage(slug);
    return apiOk(applied);
  } catch (err) {
    return handleApiError(err instanceof ApiError ? err : err);
  }
}
