import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';

/** GET /api/theme-engine/templates — templates from the currently active theme. */
export async function GET() {
  try {
    await guardTheme('view');
    const active = await themeRegistry.getActive();
    if (!active) {
      return apiOk({ activeSlug: null, templates: [] });
    }
    const templates =
      Array.isArray(active.templates) && active.templates.length > 0
        ? active.templates
        : active.manifest.templateRegistry ?? [];

    return apiOk({
      activeSlug: active.slug,
      themeName: active.name,
      templates,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** PATCH /api/theme-engine/templates — set homepage template key. */
export async function PATCH(req: Request) {
  try {
    await guardTheme('activate');
    const body = await req.json().catch(() => ({}));
    const key = typeof body.homepageTemplateKey === 'string' ? body.homepageTemplateKey.trim() : null;
    await themeRegistry.setHomepageTemplateKey(key || null);
    return apiOk({ homepageTemplateKey: key || null });
  } catch (err) {
    return handleApiError(err);
  }
}
