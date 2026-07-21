import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeLayoutApplyService } from '@/modules/theme/services/ThemeLayoutApplyService';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    layoutKey: z.string().trim().min(1).max(64).optional(),
    applyPageLayout: z.boolean().optional(),
  })
  .optional();

/**
 * POST /api/themes/[id]/apply-layout
 * Rewrite the homepage (and optional header/footer) to the theme's layout.
 * Body may also set `{ applyPageLayout: true }` so future activations auto-apply.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardTheme('activate');
    const { id } = await params;
    const raw = await req.json().catch(() => ({}));
    const body = bodySchema.parse(raw) || {};

    if (typeof body.applyPageLayout === 'boolean') {
      await ThemeLayoutApplyService.setApplyPageLayout(id, body.applyPageLayout);
    }

    const result = await ThemeLayoutApplyService.applyLayout(id, {
      layoutKey: body.layoutKey,
    });

    return apiOk({
      ...result,
      applyPageLayout: body.applyPageLayout,
      message: 'Homepage layout updated to match the theme.',
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH — only toggle the per-theme auto-apply option (no immediate rewrite). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await guardTheme('update');
    const { id } = await params;
    const { applyPageLayout } = z
      .object({ applyPageLayout: z.boolean() })
      .parse(await req.json());
    const theme = await ThemeLayoutApplyService.setApplyPageLayout(id, applyPageLayout);
    return apiOk(theme);
  } catch (err) {
    return handleApiError(err);
  }
}
