/**
 * Resolve a stored siteIcon value to a browser-usable URL.
 * Supports legacy filenames (`icon.png`), local paths, and absolute S3/CDN URLs.
 */
export function resolveSiteIconUrl(siteIcon?: string | null): string | null {
  if (!siteIcon) return null;
  const trimmed = siteIcon.trim();
  if (!trimmed) return null;

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  return `/siteicon/${trimmed}`;
}
