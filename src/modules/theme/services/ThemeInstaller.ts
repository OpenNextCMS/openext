import { ApiError } from '@/lib/api/errors';
import { ThemeRepository } from '../repositories/ThemeRepository';
import { themeDirectoryExists, getThemeDirectory } from '../utils/storage';
import type { ITheme } from '@/types/theme';

/**
 * ThemeInstaller — marks a uploaded package theme as installed.
 * Ensures filesystem assets exist; idempotent if already installed.
 */
export const ThemeInstaller = {
  async install(themeId: string): Promise<ITheme & { _id: string }> {
    const theme = await ThemeRepository.findById(themeId);
    if (!theme) throw new ApiError('Theme not found', 404);

    if (theme.isSystemTheme) {
      // System themes are always "installed" from code seed
      const updated = await ThemeRepository.updateById(themeId, { installed: true });
      if (!updated) throw new ApiError('Theme not found', 404);
      return updated;
    }

    if (theme.isPackageTheme) {
      const onDisk = await themeDirectoryExists(theme.slug);
      if (!onDisk) {
        throw new ApiError(
          'Theme package assets are missing on disk. Re-upload the theme ZIP.',
          409
        );
      }
    }

    const updated = await ThemeRepository.updateById(themeId, {
      installed: true,
      assetsPath: theme.assetsPath || getThemeDirectory(theme.slug),
    });

    if (!updated) throw new ApiError('Theme not found', 404);
    return updated;
  },
};
