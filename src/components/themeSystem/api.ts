import { apiUrl } from '@/lib/apiClient';
import type { ApiEnvelope, InstalledTheme } from './types';

/**
 * Typed client for the Theme System API (`/api/theme-system/*`). Uploads use XHR
 * so the UI can show real upload progress (spec §13 progress bar).
 */

const BASE = '/api/theme-system';

export class ThemeApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  constructor(message: string, code = 'ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ThemeApiError';
    this.code = code;
    this.details = details;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T>;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ThemeApiError(`Unexpected server response (${res.status}).`, 'PARSE_ERROR');
  }
  if (!res.ok || body.error) {
    throw new ThemeApiError(
      body.error?.message || res.statusText,
      body.error?.code || 'ERROR',
      body.error?.details
    );
  }
  return body.data as T;
}

function xhrUpload(
  url: string,
  method: 'POST' | 'PUT',
  file: File,
  onProgress?: (pct: number) => void
): Promise<InstalledTheme> {
  return new Promise<InstalledTheme>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as ApiEnvelope<InstalledTheme>;
        if (xhr.status >= 200 && xhr.status < 300 && !body.error) resolve(body.data as InstalledTheme);
        else
          reject(
            new ThemeApiError(
              body.error?.message || xhr.statusText,
              body.error?.code || 'ERROR',
              body.error?.details
            )
          );
      } catch {
        reject(new ThemeApiError('Invalid server response.', 'PARSE_ERROR'));
      }
    };
    xhr.onerror = () => reject(new ThemeApiError('Network error during upload.', 'NETWORK'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export const themeSystemApi = {
  list: () =>
    fetch(apiUrl(BASE), { cache: 'no-store', credentials: 'include' }).then((r) =>
      unwrap<InstalledTheme[]>(r)
    ),
  active: () =>
    fetch(apiUrl(`${BASE}/active`), { cache: 'no-store', credentials: 'include' }).then((r) =>
      unwrap<InstalledTheme | null>(r)
    ),
  details: (slug: string) =>
    fetch(apiUrl(`${BASE}/${slug}`), { cache: 'no-store', credentials: 'include' }).then((r) =>
      unwrap<InstalledTheme>(r)
    ),
  activate: (slug: string) =>
    fetch(apiUrl(`${BASE}/activate/${slug}`), { method: 'POST', credentials: 'include' }).then((r) =>
      unwrap<InstalledTheme>(r)
    ),
  remove: (slug: string) =>
    fetch(apiUrl(`${BASE}/${slug}`), { method: 'DELETE', credentials: 'include' }).then((r) =>
      unwrap<{ slug: string }>(r)
    ),
  updateSettings: (slug: string, settings: Record<string, unknown>) =>
    fetch(apiUrl(`${BASE}/${slug}`), {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings }),
    }).then((r) => unwrap<InstalledTheme>(r)),
  assetUrl: (slug: string, rel: string) =>
    apiUrl(`${BASE}/asset/${slug}/${rel.replace(/^\/+/, '')}`),
  upload: (file: File, onProgress?: (pct: number) => void) =>
    xhrUpload(apiUrl(`${BASE}/upload`), 'POST', file, onProgress),
  update: (slug: string, file: File, onProgress?: (pct: number) => void) =>
    xhrUpload(apiUrl(`${BASE}/update/${slug}`), 'PUT', file, onProgress),

  listFiles: (slug: string) =>
    fetch(apiUrl(`${BASE}/${slug}/files`), { cache: 'no-store', credentials: 'include' }).then((r) =>
      unwrap<string[]>(r)
    ),
  readFile: (slug: string, path: string) =>
    fetch(apiUrl(`${BASE}/${slug}/file?path=${encodeURIComponent(path)}`), {
      cache: 'no-store',
      credentials: 'include',
    }).then((r) => unwrap<{ path: string; content: string }>(r)),
  writeFile: (slug: string, path: string, content: string) =>
    fetch(apiUrl(`${BASE}/${slug}/file`), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, content }),
    }).then((r) => unwrap<{ path: string }>(r)),
};
