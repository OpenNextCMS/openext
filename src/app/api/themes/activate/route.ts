import { NextRequest } from 'next/server';
import { handleApiError } from '@/lib/api/response';
import { ThemeActivationController } from '@/modules/theme';
import { activateThemeSchema } from '@/lib/theme/theme-validator';

export const dynamic = 'force-dynamic';

/** POST /api/themes/activate { id } — make a theme the single active theme. */
export async function POST(req: NextRequest) {
  try {
    const { id } = activateThemeSchema.parse(await req.json());
    return ThemeActivationController.activate(id);
  } catch (err) {
    return handleApiError(err);
  }
}
