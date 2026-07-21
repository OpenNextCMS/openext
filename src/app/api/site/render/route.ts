import { NextRequest } from 'next/server';
import { TemplateThemeRenderer } from '@/modules/theme/services/TemplateThemeRenderer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/site/render?path=<slug> — WordPress-style renderer output.
 *
 * When the active theme is a "template" theme, this returns the theme's own HTML
 * for the requested path (asset URLs rewritten, dynamic tags filled) as a real
 * text/html document — exactly like the theme's file. The public page route
 * embeds this so the site renders verbatim.
 */
export async function GET(req: NextRequest) {
  const active = await TemplateThemeRenderer.getActive();
  if (!active) {
    return new Response('No template theme is active.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const path = req.nextUrl.searchParams.get('path') || '';
  const { html, status } = await TemplateThemeRenderer.renderSite(active.slug, path, active);
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
