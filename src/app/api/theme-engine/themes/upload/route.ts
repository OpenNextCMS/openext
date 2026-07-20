import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { ThemeEngineError, ThemeInstallError } from '@/modules/themeEngine/errors';
import { MAX_UPLOAD_BYTES } from '@/modules/themeEngine/config';

/**
 * POST /api/theme-engine/themes/upload — Theme Engine ZIP upload (new
 * spec-driven pipeline; unrelated to the old /api/themes/upload, which talks
 * to a different, incompatible package format). Accepts multipart `file`
 * (.zip) + optional `replace` field ("true" to upgrade an existing slug).
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await guardTheme('create');

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      throw new ApiError('Expected multipart/form-data with a "file" field.', 400);
    }
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new ApiError('No file uploaded. Send the ZIP as form field "file".', 400);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError(`Theme ZIP is too large (max ${(MAX_UPLOAD_BYTES / 1048576).toFixed(0)} MB).`, 413);
    }
    const replace = form.get('replace') === 'true';

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await themeManager.uploadAndInstall(buffer, ctx.userId, { replace });

    return apiOk({
      slug: doc.slug,
      name: doc.name,
      version: doc.version,
      status: doc.status,
      installLog: doc.installLog,
    });
  } catch (err) {
    if (err instanceof ThemeInstallError && err.errors.length > 0) {
      const fields: Record<string, string> = {};
      for (const e of err.errors) fields[e.file || e.code] = e.message;
      return handleApiError(new ApiError(err.message, 400, fields));
    }
    if (err instanceof ThemeEngineError) {
      const status = err.code === 'THEME_ALREADY_EXISTS' ? 409 : 400;
      return handleApiError(new ApiError(err.message, status));
    }
    return handleApiError(err);
  }
}
