import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { toThemeListItem } from '@/modules/themeEngine/themeDetailPayload';

/** GET /api/theme-engine/themes — list installed themes + which slug is active. */
export async function GET() {
  try {
    await guardTheme('view');
    const [themes, active, settings] = await Promise.all([
      themeManager.listInstalled(),
      themeRegistry.getActive(),
      themeRegistry.getSettings(),
    ]);
    const activeSlug = active?.slug ?? null;
    return apiOk({
      activeSlug,
      previousThemeSlug: settings.previousThemeSlug,
      homepageTemplateKey: settings.homepageTemplateKey ?? null,
      themes: themes.map((t) => toThemeListItem(t, activeSlug)),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
