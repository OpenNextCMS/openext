import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { guardTheme } from '@/lib/theme/guard';
import { themePreviewService } from '@/modules/themeEngine/ThemePreviewService';
import { PREVIEW_COOKIE_NAME } from '@/modules/themeEngine/config';

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/** GET /api/theme-engine/preview — is a preview session currently active, and for which slug? */
export async function GET(req: NextRequest) {
  try {
    await guardTheme('view');
    const token = req.cookies.get(PREVIEW_COOKIE_NAME)?.value;
    const previewSlug = token ? await themePreviewService.getPreviewTheme(token) : null;
    return apiOk({ active: !!previewSlug, slug: previewSlug });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/theme-engine/preview — end whatever preview session is active (if any) and clear the cookie. */
export async function DELETE(req: NextRequest) {
  try {
    await guardTheme('view');
    const token = req.cookies.get(PREVIEW_COOKIE_NAME)?.value;
    if (token) await themePreviewService.endPreview(token);

    const res = apiOk({ ended: true });
    res.cookies.set(PREVIEW_COOKIE_NAME, '', {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: 'strict',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
