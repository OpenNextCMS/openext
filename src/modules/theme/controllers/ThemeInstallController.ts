import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeInstaller } from '../services/ThemeInstaller';

/**
 * ThemeInstallController — POST /api/themes/:id/install
 */
export const ThemeInstallController = {
  async install(id: string) {
    try {
      await guardTheme('update');
      const theme = await ThemeInstaller.install(id);
      return apiOk(theme);
    } catch (err) {
      return handleApiError(err);
    }
  },
};
