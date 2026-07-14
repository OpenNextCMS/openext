import { ApiError } from '@/lib/api/errors';
import { exportThemeToZipBuffer } from '../utils/ThemeExporter';
import { ThemeRepository } from '../repositories/ThemeRepository';

/**
 * ThemeExporter service — serialize a theme (package or builder-customized) to ZIP.
 */
export const ThemeExporter = {
  async exportById(themeId: string): Promise<{ buffer: Buffer; filename: string }> {
    const theme = await ThemeRepository.findById(themeId);
    if (!theme) throw new ApiError('Theme not found', 404);

    const buffer = await exportThemeToZipBuffer(theme);
    const filename = `${theme.slug || 'theme'}-v${theme.packageVersion || theme.version || '1.0.0'}.zip`;
    return { buffer, filename };
  },
};
