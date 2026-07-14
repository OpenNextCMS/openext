import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeActivationService } from '../services/ThemeActivationService';

/**
 * ThemeActivationController — POST /api/themes/:id/activate
 * Also used by POST /api/themes/activate { id }.
 */
export const ThemeActivationController = {
  async activate(id: string) {
    try {
      await guardTheme('activate');
      const theme = await ThemeActivationService.activate(id);
      return apiOk(theme);
    } catch (err) {
      return handleApiError(err);
    }
  },
};
