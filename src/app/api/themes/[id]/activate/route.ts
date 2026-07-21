import { NextRequest } from 'next/server';
import { ThemeActivationController } from '@/modules/theme';
import { handleApiError } from '@/lib/api/response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  applyToEditor: z.boolean().optional(),
});

/** POST /api/themes/[id]/activate — activate theme for the live site. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const body = bodySchema.parse(json ?? {});
    return ThemeActivationController.activate(id, {
      applyToEditor: body.applyToEditor,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
