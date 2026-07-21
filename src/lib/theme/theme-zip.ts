import JSZip from 'jszip';
import { ApiError } from '@/lib/api/errors';
import { normalizeThemePackage, type NormalizedThemePackage } from './theme-package';

/**
 * Theme ZIP (import) format.
 *
 * A theme ZIP is just a portable *container* for the same JSON token package a
 * bare `.json` upload carries — it is NOT code. Its accepted shape is:
 *
 *   my-theme.zip
 *   ├── theme.json      (required — the token manifest; `manifest.json` also accepted)
 *   ├── preview.png     (optional — gallery image; jpg/webp/gif also accepted)
 *   └── assets/         (optional — fonts, etc.; currently ignored on import)
 *
 * A single wrapping root folder (e.g. `my-theme/theme.json`) is tolerated. The
 * manifest is validated by the exact same `normalizeThemePackage` used for JSON
 * uploads, so both routes accept identical token content. Everything is read
 * in-memory — nothing is written to disk, so there is NO zip-slip / path-traversal
 * surface (unlike the legacy `/api/themes/extract` route).
 */

/** base64 inflates ~33%, so 140 KB raw stays under the 200 000-char previewImage cap. */
const MAX_PREVIEW_IMAGE_BYTES = 140 * 1024;
/** The manifest is tiny; this guards against a zip-bomb JSON entry. */
const MAX_MANIFEST_BYTES = 512 * 1024;
/** Sum of all uncompressed entries — a coarse zip-bomb guard. */
const MAX_TOTAL_UNZIPPED_BYTES = 10 * 1024 * 1024;

const MANIFEST_NAMES = ['theme.json', 'manifest.json'];
const PREVIEW_RE = /^preview\.(png|jpe?g|webp|gif)$/i;
const IMAGE_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

const basename = (p: string) => p.split('/').pop() || p;
const depth = (p: string) => p.split('/').filter(Boolean).length;

/** JSZip stashes the declared uncompressed size on an internal field; read it defensively. */
function uncompressedSize(entry: JSZip.JSZipObject): number {
  return (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
}

/**
 * Parse an uploaded theme ZIP into the same NormalizedThemePackage a JSON upload
 * produces. Throws ApiError (400/413) on a malformed or oversized archive.
 */
export async function parseThemeZip(
  data: ArrayBuffer,
  opts?: { fallbackName?: string }
): Promise<NormalizedThemePackage> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new ApiError('Could not read the ZIP file — is it a valid archive?', 400);
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  if (entries.length === 0) throw new ApiError('The ZIP is empty.', 400);

  // Coarse zip-bomb guard across every entry.
  const totalBytes = entries.reduce((sum, f) => sum + uncompressedSize(f), 0);
  if (totalBytes > MAX_TOTAL_UNZIPPED_BYTES) {
    throw new ApiError('The ZIP contents are too large.', 413);
  }

  // Locate the manifest: a theme.json / manifest.json (shallowest wins), else the
  // single .json file in the archive.
  const namedManifest = entries
    .filter((f) => MANIFEST_NAMES.includes(basename(f.name).toLowerCase()))
    .sort((a, b) => depth(a.name) - depth(b.name))[0];
  const jsonEntries = entries.filter((f) => basename(f.name).toLowerCase().endsWith('.json'));
  const manifestEntry = namedManifest ?? (jsonEntries.length === 1 ? jsonEntries[0] : undefined);

  if (!manifestEntry) {
    throw new ApiError(
      'No theme.json found in the ZIP. A theme ZIP must contain a "theme.json" manifest at its root.',
      400
    );
  }
  if (uncompressedSize(manifestEntry) > MAX_MANIFEST_BYTES) {
    throw new ApiError('The theme manifest is too large.', 413);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(await manifestEntry.async('string'));
  } catch {
    throw new ApiError(`"${basename(manifestEntry.name)}" is not valid JSON.`, 400);
  }

  const pkg = normalizeThemePackage(manifest, opts);

  // Bundle an optional preview image, but only when the manifest didn't set one.
  if (!pkg.previewImage) {
    const dir = manifestEntry.name.includes('/')
      ? manifestEntry.name.slice(0, manifestEntry.name.lastIndexOf('/') + 1)
      : '';
    const previewEntry = entries
      .filter((f) => PREVIEW_RE.test(basename(f.name)))
      // Prefer a preview beside the manifest, then the shallowest.
      .sort(
        (a, b) =>
          (a.name.startsWith(dir) ? 0 : 1) - (b.name.startsWith(dir) ? 0 : 1) ||
          depth(a.name) - depth(b.name)
      )[0];

    if (previewEntry && uncompressedSize(previewEntry) <= MAX_PREVIEW_IMAGE_BYTES) {
      const buf = await previewEntry.async('nodebuffer');
      if (buf.length <= MAX_PREVIEW_IMAGE_BYTES) {
        const ext = basename(previewEntry.name).split('.').pop()!.toLowerCase();
        pkg.previewImage = `data:${IMAGE_MIME[ext] || 'image/png'};base64,${buf.toString('base64')}`;
      }
    }
    // An oversized/missing preview is not an error — the theme still imports.
  }

  return pkg;
}
