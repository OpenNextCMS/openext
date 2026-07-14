import { NextRequest } from 'next/server';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeRegistry } from '../services/ThemeRegistry';
import { updateThemeSchema } from '@/lib/theme/theme-validator';
import type { ThemePackageUpdateInput } from '../types';

/**
 * ThemeCrudController — list / get / update / delete for package-aware themes.
 */
export const ThemeCrudController = {
  async list() {
    try {
      await guardTheme('view');
      const themes = await ThemeRegistry.list();
      const res = apiOk(themes, { meta: { total: themes.length, hasMore: false } });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    } catch (err) {
      return handleApiError(err);
    }
  },

  async getById(id: string) {
    try {
      await guardTheme('view');
      const theme = await ThemeRegistry.getById(id);
      if (!theme) return apiError('Theme not found', 404);
      return apiOk(theme);
    } catch (err) {
      return handleApiError(err);
    }
  },

  async update(req: NextRequest, id: string) {
    try {
      await guardTheme('update');
      const body = (await req.json()) as ThemePackageUpdateInput;
      // Reuse Theme Builder schema when token groups are present
      if (body.theme || body.name || body.description || body.componentVariants) {
        updateThemeSchema.parse({
          name: body.name,
          description: body.description,
          theme: body.theme,
          componentVariants: body.componentVariants,
          previewImage: body.previewImage,
        });
      }
      const theme = await ThemeRegistry.update(id, body);
      return apiOk(theme);
    } catch (err) {
      return handleApiError(err);
    }
  },

  async remove(id: string) {
    try {
      await guardTheme('delete');
      await ThemeRegistry.delete(id);
      return apiOk({ id, deleted: true });
    } catch (err) {
      return handleApiError(err);
    }
  },
};
