import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { hasBlockedExtension, isSafeRelativePath } from '@/lib/plugins/manifest';
import { PLUGINS_PUBLIC_DIR } from '@/lib/plugins/storage';

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
};

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/;

function isPathInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pluginId: string; file: string[] }> }
) {
  const { pluginId, file } = await params;
  const relativePath = file.join('/');

  if (
    !PLUGIN_ID_PATTERN.test(pluginId) ||
    !isSafeRelativePath(relativePath) ||
    hasBlockedExtension(relativePath)
  ) {
    return NextResponse.json({ message: 'Invalid plugin asset path' }, { status: 400 });
  }

  const pluginDir = path.join(PLUGINS_PUBLIC_DIR, pluginId);
  const assetPath = path.join(pluginDir, relativePath);

  if (!isPathInside(pluginDir, assetPath)) {
    return NextResponse.json({ message: 'Invalid plugin asset path' }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(assetPath);
    const ext = path.extname(assetPath).toLowerCase();

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Plugin asset not found' }, { status: 404 });
  }
}
