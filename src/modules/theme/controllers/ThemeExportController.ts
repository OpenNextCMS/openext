import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeExporter } from '../services/ThemeExporter';

/**
 * ThemeExportController — GET /api/themes/:id/export
 */
export const ThemeExportController = {
  async export(id: string) {
    try {
      await guardTheme('view');
      const { buffer, filename } = await ThemeExporter.exportById(id);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      return handleApiError(err);
    }
  },
};
