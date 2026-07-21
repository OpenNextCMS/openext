/**
 * Resolve which backend serves /api.
 *
 * - NEXT_PUBLIC_BACKEND_URL set (e.g. http://localhost:3012) → external API
 * - NEXT_PUBLIC_BACKEND_URL unset/empty → embedded Next.js API (same origin)
 */

/** True when API is served by the embedded Next.js app (same origin). */
export function useLocalApi(): boolean {
  return !resolveBackendBaseUrl();
}

/**
 * Base URL for API/asset requests.
 * Empty string = same origin (relative /api/... paths).
 */
export function resolveBackendBaseUrl(): string {
  const url = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
  if (!url) return '';
  return url.replace(/\/$/, '');
}
