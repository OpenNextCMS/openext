import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/api/response';
import { ThemeActivationController } from '@/modules/theme';
import { activateThemeSchema } from '@/lib/theme/theme-validator';

export const dynamic = 'force-dynamic';

/** POST /api/themes/activate { id, applyToEditor? } — make a theme the single active theme. */
export async function POST(req: NextRequest) {
  try {
    const body = activateThemeSchema.parse(await req.json());
    return ThemeActivationController.activate(body.id, {
      applyToEditor: body.applyToEditor,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
