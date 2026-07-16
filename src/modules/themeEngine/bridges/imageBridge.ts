/**
 * `image()` bridge (spec §4.11) — v1 PLACEHOLDER, deliberately minimal.
 *
 * No central media-library resolver exists anywhere in this CMS today
 * (confirmed during planning): uploads are scattered filename/path strings
 * written directly onto whichever document referenced them, across several
 * unrelated upload endpoints. This bridge does the smallest useful thing —
 * pass an absolute URL through unchanged, or normalize a relative reference
 * to a site-relative path — and does NOT resize or reformat. `opts.width`/
 * `opts.height` are accepted (to match the spec's signature) but are a
 * documented no-op. Do not grow this into a real media/resize pipeline as
 * part of the theme engine — that is explicitly out of scope.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept to match the spec's image(ref, opts?) signature; a documented no-op in v1.
export function resolveImageUrl(cmsImageRef: string, opts?: { width?: number; height?: number }): string {
  if (!cmsImageRef) return '';
  if (/^[a-z]+:\/\//i.test(cmsImageRef) || cmsImageRef.startsWith('data:')) return cmsImageRef; // absolute / data URI
  if (cmsImageRef.startsWith('/')) return cmsImageRef; // already site-relative
  return `/${cmsImageRef.replace(/^\.?\/+/, '')}`;
}
