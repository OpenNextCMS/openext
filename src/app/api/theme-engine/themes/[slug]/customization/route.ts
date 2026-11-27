import { z } from 'zod';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeCustomizationRepository } from '@/modules/themeEngine/repositories/ThemeCustomizationRepository';
import { flattenSettingsSchema, defaultsFromSettingsSchema } from '@/modules/themeEngine/settingsSchema';
import { ThemeNotFoundError } from '@/modules/themeEngine/errors';

/** GET /api/theme-engine/themes/[slug]/customization */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await guardTheme('view');
    const { slug } = await params;
    const theme = await themeManager.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);

    const [values, schema] = await Promise.all([
      themeCustomizationRepository.get(slug),
      Promise.resolve(flattenSettingsSchema(theme.manifest)),
    ]);

    return apiOk({
      themeSlug: slug,
      values,
      defaults: defaultsFromSettingsSchema(theme.manifest),
      schema,
    });
  } catch (err) {
    if (err instanceof ThemeNotFoundError) {
      return handleApiError(new ApiError(err.message, 404));
    }
    return handleApiError(err);
  }
}

const bodySchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

/** PUT /api/theme-engine/themes/[slug]/customization */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const ctx = await guardTheme('activate');
    const { slug } = await params;
    const theme = await themeManager.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);

    const json = await req.json();
    const body = bodySchema.parse(json);

    await themeCustomizationRepository.save(slug, body.values, ctx.userId);
    return apiOk({ themeSlug: slug, values: body.values });
  } catch (err) {
    if (err instanceof ThemeNotFoundError) {
      return handleApiError(new ApiError(err.message, 404));
    }
    return handleApiError(err);
  }
}
