import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { ThemeEngineEditorApplyService } from '@/modules/themeEngine/ThemeEngineEditorApplyService';
import { ThemeEngineError } from '@/modules/themeEngine/errors';

const bodySchema = z.object({
  applyToEditor: z.boolean().optional(),
  /**
   * Legacy modes are accepted but ignored — activation always loads the exact
   * theme render with schema-declared editable sections when available.
   */
  editorMode: z.enum(['live-frame', 'editable-blocks', 'exact-editable']).optional(),
});

/** POST /api/theme-engine/themes/[slug]/activate */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const ctx = await guardTheme('activate');
    const { slug } = await params;
    const json = await req.json().catch(() => ({}));
    const body = bodySchema.parse(json ?? {});

    await themeManager.activate(slug, ctx.userId);

    let appliedToEditor: {
      pageId: string;
      slug: string;
      blockCount: number;
      mode: string;
    } | null = null;
    if (body.applyToEditor) {
      appliedToEditor = await ThemeEngineEditorApplyService.applyToHomepage(slug);
    }

    return apiOk({ activatedSlug: slug, appliedToEditor });
  } catch (err) {
    if (err instanceof ThemeEngineError) {
      const status = err.code === 'THEME_NOT_FOUND' ? 404 : 400;
      return handleApiError(new ApiError(err.message, status));
    }
    return handleApiError(err);
  }
}
