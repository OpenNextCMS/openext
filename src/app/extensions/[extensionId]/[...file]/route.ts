import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { EXTENSION_ID_PATTERN } from '@/lib/extensions/constants';
import { extensionErrorResponse } from '@/lib/extensions/http';
import { createDefaultExtensionServices } from '@/lib/extensions/lifecycle';
import { isSafeRelativePath } from '@/lib/plugins/manifest';
import { requireAnyCapability } from '@/lib/rbac';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ extensionId: string; file: string[] }> }
) {
  try {
    await requireAnyCapability('plugins.view', 'plugins.manage');
    const { extensionId, file } = await params;
    const relativePath = file.join('/');
    if (!EXTENSION_ID_PATTERN.test(extensionId) || !isSafeRelativePath(relativePath)) {
      return NextResponse.json({ message: 'Invalid extension asset path' }, { status: 400 });
    }
    const services = await createDefaultExtensionServices();
    const record = await services.repo.findByExtensionId(extensionId);
    if (!record || !['installed', 'enabled', 'disabled'].includes(record.status)) {
      return NextResponse.json({ message: 'Extension asset not found' }, { status: 404 });
    }
    const version = (await services.storage.readCurrent(extensionId)) || record.version;
    const assetPath = services.storage.resolvePublicFile(extensionId, version, relativePath);
    const fileBuffer = await fs.readFile(assetPath);
    const ext = path.extname(assetPath).toLowerCase();
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return NextResponse.json({ message: 'Extension asset not found' }, { status: 404 });
    }
    return extensionErrorResponse(error);
  }
}
