import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { THEMES_ROOT } from '@/modules/themeEngine/config';

/**
 * Serves a theme's static assets (`assets/style.css`, `assets/theme.js`,
 * `public/**`) — the backing route for `AssetManager`'s
 * `/theme-assets/{slug}/{path}` URLs.
 *
 * Deliberately NEVER serves `.tsx`/`.ts` (theme source) — only a fixed
 * whitelist of genuinely public asset types. Path-traversal-safe via the
 * same `path.resolve` + prefix check used throughout the engine (never
 * string-matching alone).
 */
const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

function isInside(root: string, candidate: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; path: string[] }> }
) {
  const { slug, path: pathSegments } = await params;
  const relativePath = pathSegments.join('/');
  const ext = path.extname(relativePath).toLowerCase();

  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const root = path.join(THEMES_ROOT, slug);
  const abs = path.join(root, relativePath);
  if (!isInside(root, abs)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const content = await fs.readFile(abs);
    const isContentHashed = new URL(req.url).searchParams.has('v');
    return new NextResponse(new Uint8Array(content), {
      headers: {
        'Content-Type': contentType,
        // Hashed URLs (style.css/theme.js) can cache forever — the hash IS the version.
        'Cache-Control': isContentHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
