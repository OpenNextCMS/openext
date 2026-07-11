import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';
import { normalizeThemePackage } from '@/lib/theme/theme-package';

export const dynamic = 'force-dynamic';

/** Token JSON is tiny; this guards against oversized/abuse uploads. */
const MAX_THEME_JSON_BYTES = 512 * 1024; // 512KB

function parseJsonOrThrow(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('Uploaded file is not valid JSON.', 400);
  }
}

/**
 * POST /api/themes/import — create a theme from an uploaded JSON token package.
 *
 * Accepts either a raw JSON body (`application/json`) or a multipart form with a
 * `file` field (a `.json` file). Partial configs are merged onto the defaults and
 * structurally validated before the theme is created as a NON-ACTIVE custom theme,
 * so importing never disturbs the live site — the user activates it afterwards.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await guardTheme('create');

    const contentType = req.headers.get('content-type') || '';
    let raw: unknown;
    let fallbackName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new ApiError('No file uploaded.', 400);
      if (file.size > MAX_THEME_JSON_BYTES) throw new ApiError('Theme file is too large.', 413);
      raw = parseJsonOrThrow(await file.text());
      fallbackName = file.name.replace(/\.json$/i, '');
    } else {
      raw = await req.json().catch(() => {
        throw new ApiError('Invalid JSON body.', 400);
      });
    }

    const pkg = normalizeThemePackage(raw, { fallbackName });
    const theme = await ThemeService.create(tenantId, pkg, userId);
    return apiOk(theme, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
