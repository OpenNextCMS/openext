import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';

/** GET /api/theme-engine/themes — list installed themes + which slug is active. */
export async function GET() {
  try {
    await guardTheme('view');
    const [themes, active] = await Promise.all([themeManager.listInstalled(), themeRegistry.getActive()]);
    return apiOk({
      activeSlug: active?.slug ?? null,
      themes: themes.map((t) => ({
        slug: t.slug,
        name: t.name,
        author: t.author,
        version: t.version,
        description: t.description || '',
        status: t.status,
        installedAt: t.installedAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
