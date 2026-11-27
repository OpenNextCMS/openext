import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { extractTemplateMetadata } from '@/modules/themeEngine/templateMetadata';
import type { ThemeTemplateMeta } from '@/modules/themeEngine/types';

/** GET /api/theme-engine/themes/[slug]/templates — list templates for a theme. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await guardTheme('view');
    const { slug } = await params;
    const theme = await themeManager.getBySlug(slug);
    if (!theme) {
      return handleApiError(new ApiError(`Theme "${slug}" not found.`, 404));
    }

    const templates: ThemeTemplateMeta[] =
      Array.isArray(theme.templates) && theme.templates.length > 0
        ? (theme.templates as ThemeTemplateMeta[])
        : extractTemplateMetadata(theme.manifest);

    return apiOk({ slug, templates, count: templates.length });
  } catch (err) {
    return handleApiError(err);
  }
}
