import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/api/errors';
import { MAX_THEME_PACKAGE_BYTES } from '../constants';
import { validateZipUpload } from '../validators/PackageValidator';

/**
 * Upload middleware helpers for theme package routes.
 * Uses native FormData (no multer) to match the rest of the Next.js App Router.
 */

export async function readThemeZipFromRequest(req: NextRequest): Promise<File> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('Expected multipart/form-data with a "file" field.', 400);
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new ApiError('No file uploaded. Send the ZIP as form field "file".', 400);
  }

  validateZipUpload(file);

  if (file.size > MAX_THEME_PACKAGE_BYTES) {
    throw new ApiError('Theme ZIP is too large.', 413);
  }

  return file;
}
