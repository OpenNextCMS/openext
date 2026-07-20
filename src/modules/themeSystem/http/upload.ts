import type { NextRequest } from 'next/server';
import { LIMITS, ACCEPTED_ZIP_MIME } from '../config';
import { CorruptedZipError, UploadTooLargeError } from '../errors';

/**
 * readUploadedZip — upload middleware (spec §5, §9). Parses the multipart body,
 * enforces the 100 MB cap and the ZIP MIME/extension, and returns the raw bytes.
 * Size is checked BEFORE buffering the whole file into memory.
 */
export async function readUploadedZip(req: NextRequest): Promise<Buffer> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new CorruptedZipError('Expected a multipart/form-data upload with a "file" field.');
  }

  // Fast-reject via declared length before reading the stream.
  const declaredLength = Number(req.headers.get('content-length') || 0);
  if (declaredLength && declaredLength > LIMITS.MAX_UPLOAD_BYTES * 1.05) {
    throw new UploadTooLargeError(LIMITS.MAX_UPLOAD_BYTES);
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    throw new CorruptedZipError('No "file" field found in the upload.');
  }
  if (file.size <= 0) throw new CorruptedZipError('Uploaded file is empty.');
  if (file.size > LIMITS.MAX_UPLOAD_BYTES) throw new UploadTooLargeError(LIMITS.MAX_UPLOAD_BYTES);

  const nameOk = /\.zip$/i.test(file.name);
  const type = (file.type || '').toLowerCase();
  const typeOk = !type || ACCEPTED_ZIP_MIME.has(type) || type.includes('zip');
  if (!nameOk && !typeOk) {
    throw new CorruptedZipError('The theme package must be a .zip file.');
  }

  return Buffer.from(await file.arrayBuffer());
}
