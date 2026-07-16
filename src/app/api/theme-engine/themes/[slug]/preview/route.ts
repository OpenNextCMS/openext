import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { themePreviewService } from '@/modules/themeEngine/ThemePreviewService';
import { ThemeEngineError } from '@/modules/themeEngine/errors';
import { PREVIEW_COOKIE_NAME } from '@/modules/themeEngine/config';

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/**
 * POST /api/theme-engine/themes/[slug]/preview — start a preview session.
 * This is the ONLY place the preview cookie is written (spec §4.12) —
 * httpOnly + sameSite:strict, scoped to `/` so it's readable by the public
 * `[slug]` route that actually renders the preview.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const ctx = await guardTheme('view');
    const { slug } = await params;
    const ticket = await themePreviewService.startPreview(slug, ctx.userId);

    const res = apiOk({ slug, token: ticket.token, expiresAt: ticket.expiresAt });
    res.cookies.set(PREVIEW_COOKIE_NAME, ticket.token, {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: 'strict',
      path: '/',
      expires: ticket.expiresAt,
    });
    return res;
  } catch (err) {
    if (err instanceof ThemeEngineError) {
      const status = err.code === 'THEME_NOT_FOUND' ? 404 : 400;
      return handleApiError(new ApiError(err.message, status));
    }
    return handleApiError(err);
  }
}
