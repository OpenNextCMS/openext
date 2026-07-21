import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeUploadService } from '../services/ThemeUploadService';
import { readThemeZipFromRequest } from '../middleware/upload.middleware';

/**
 * ThemeUploadController — POST /api/themes/upload
 */
export const ThemeUploadController = {
  async upload(req: NextRequest) {
    try {
      const { tenantId, userId } = await guardTheme('create');
      const file = await readThemeZipFromRequest(req);
      const theme = await ThemeUploadService.uploadFromFile(file, { tenantId, userId });
      return apiOk(theme, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  },
};
