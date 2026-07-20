import { NextRequest } from 'next/server';
import { ThemeUploadController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/**
 * POST /api/themes/upload — Theme Package Manager ZIP upload.
 * Replaces the legacy folder-theme registrar. Accepts multipart `file` (.zip).
 */
export async function POST(req: NextRequest) {
  return ThemeUploadController.upload(req);
}
