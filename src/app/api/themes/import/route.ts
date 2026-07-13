import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { guardTheme } from '@/lib/theme/guard';
import { ThemeService } from '@/lib/theme/theme-service';
import { normalizeThemePackage, type NormalizedThemePackage } from '@/lib/theme/theme-package';
import { parseThemeZip } from '@/lib/theme/theme-zip';

export const dynamic = 'force-dynamic';

/** Token JSON is tiny; this guards against oversized/abuse uploads. */
const MAX_THEME_JSON_BYTES = 512 * 1024; // 512KB
/** A ZIP may carry a preview image + assets, so it gets a larger (but still bounded) cap. */
const MAX_THEME_ZIP_BYTES = 5 * 1024 * 1024; // 5MB

/** A ZIP upload by filename or reported content type (browsers vary on the latter). */
function isZipUpload(file: File): boolean {
  return /\.zip$/i.test(file.name) || (file.type || '').toLowerCase().includes('zip');
}

function parseJsonOrThrow(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('Uploaded file is not valid JSON.', 400);
  }
}

/**
 * POST /api/themes/import — create a theme from an uploaded token package.
 *
 * Accepts three inputs, all resolving to the same token package:
 *   • a raw JSON body (`application/json`);
 *   • a multipart form with a `file` field that is a `.json` file;
 *   • a multipart form with a `file` field that is a `.zip` bundle — a `theme.json`
 *     manifest plus an optional `preview` image (see `theme-zip.ts`).
 * Partial configs are merged onto the defaults and structurally validated before
 * the theme is created as a NON-ACTIVE custom theme, so importing never disturbs
 * the live site — the user activates it afterwards.
 */
export async function POST(req: NextRequest) {
  try {
    const { tenantId, userId } = await guardTheme('create');

    const contentType = req.headers.get('content-type') || '';
    let pkg: NormalizedThemePackage;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) throw new ApiError('No file uploaded.', 400);

      if (isZipUpload(file)) {
        if (file.size > MAX_THEME_ZIP_BYTES) throw new ApiError('Theme ZIP is too large.', 413);
        pkg = await parseThemeZip(await file.arrayBuffer(), {
          fallbackName: file.name.replace(/\.zip$/i, ''),
        });
      } else {
        if (file.size > MAX_THEME_JSON_BYTES) throw new ApiError('Theme file is too large.', 413);
        pkg = normalizeThemePackage(parseJsonOrThrow(await file.text()), {
          fallbackName: file.name.replace(/\.json$/i, ''),
        });
      }
    } else {
      const raw = await req.json().catch(() => {
        throw new ApiError('Invalid JSON body.', 400);
      });
      pkg = normalizeThemePackage(raw);
    }

    const theme = await ThemeService.create(tenantId, pkg, userId);
    return apiOk(theme, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
