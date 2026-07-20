/**
 * Central API base for the UI-only CMS.
 * All HTTP calls to the backend must go through apiUrl().
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3012'
).replace(/\/$/, '');

/** Build an absolute URL against the external API (path must start with /). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Absolute URL for backend-hosted assets (plugins, theme files, uploads). */
export function assetUrl(path: string): string {
  return apiUrl(path);
}

/** Default fetch init for cookie-authenticated API calls. */
export const apiFetchInit: RequestInit = {
  credentials: 'include',
};

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(apiUrl(path), {
    ...apiFetchInit,
    ...init,
    headers: {
      ...(init.headers || {}),
    },
  });
}
