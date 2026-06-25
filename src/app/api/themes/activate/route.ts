import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';
import { activateThemeSchema } from '@/lib/theme/theme-validator';

/** POST /api/themes/activate { id } — make a theme the single active theme. */
export async function POST(req: NextRequest) {
  try {
    await guardTheme('activate');
    const { id } = activateThemeSchema.parse(await req.json());
    const theme = await ThemeService.activate(id);
    return apiOk(theme);
  } catch (err) {
    return handleApiError(err);
  }
}
