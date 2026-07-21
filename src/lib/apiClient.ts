/**
 * Central API base for the CMS UI.
 * Set NEXT_PUBLIC_BACKEND_URL to use an external API; omit it for the embedded Next.js API.
 */
import { resolveBackendBaseUrl } from '@/lib/backendUrl';

export const API_BASE = resolveBackendBaseUrl();

/** Build a URL for an API path (path must start with /). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) return p;
  return `${API_BASE}${p}`;
}

/** URL for backend-hosted assets (plugins, theme files, uploads). */
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
