import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Files uploaded via /api/editor/background-upload are written to this folder at
// runtime. Next.js only serves assets that exist in `public/` when the server
// starts, so those runtime-written files are NOT reachable via their static
// `/upload/backgrounds/...` URL (they 404). This route reads them from disk on
// every request, so freshly uploaded images render immediately. A rewrite in
// next.config.ts maps the original `/upload/backgrounds/*` URLs here, so both
// new uploads and already-saved image references resolve.
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'upload', 'backgrounds');

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  // Only allow a bare filename — strip any path components to prevent traversal.
  const safeName = path.basename(file);
  const fullPath = path.join(UPLOAD_DIR, safeName);

  if (!fullPath.startsWith(UPLOAD_DIR) || !fs.existsSync(fullPath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const ext = path.extname(safeName).toLowerCase();

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      // Filenames are timestamp-prefixed and unique, so they can be cached hard.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
