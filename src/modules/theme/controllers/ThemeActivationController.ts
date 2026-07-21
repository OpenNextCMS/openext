import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeActivationService } from '../services/ThemeActivationService';

/**
 * ThemeActivationController — POST /api/themes/:id/activate
 * Also used by POST /api/themes/activate { id, applyToEditor? }.
 */
export const ThemeActivationController = {
  async activate(id: string, opts?: { applyToEditor?: boolean }) {
    try {
      await guardTheme('activate');
      const result = await ThemeActivationService.activate(id, opts);
      return apiOk({
        ...result.theme,
        appliedToEditor: result.appliedToEditor,
      });
    } catch (err) {
      return handleApiError(err);
    }
  },
};
