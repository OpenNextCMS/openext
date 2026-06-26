import type { ThemeDTO, ThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Thin client for the Theme Builder REST API. Unwraps the `{ data, error }`
 * envelope and throws on error (so callers can toast the message).
 */

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error?.message || `Request failed (${res.status})`);
  }
  return json.data as T;
}

export interface CreateThemePayload {
  name: string;
  description?: string;
  theme: ThemeConfig;
  componentVariants?: ComponentVariants;
  duplicateFrom?: string;
}

export interface UpdateThemePayload {
  name?: string;
  description?: string;
  theme?: Partial<ThemeConfig>;
  componentVariants?: ComponentVariants;
}

export const themeApi = {
  async list(): Promise<ThemeDTO[]> {
    const res = await fetch('/api/themes', { credentials: 'include' });
    return unwrap<ThemeDTO[]>(res);
  },

  async get(id: string): Promise<ThemeDTO> {
    const res = await fetch(`/api/themes/${id}`, { credentials: 'include' });
    return unwrap<ThemeDTO>(res);
  },

  async create(payload: CreateThemePayload): Promise<ThemeDTO> {
    const res = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return unwrap<ThemeDTO>(res);
  },

  async update(id: string, payload: UpdateThemePayload): Promise<ThemeDTO> {
    const res = await fetch(`/api/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return unwrap<ThemeDTO>(res);
  },

  async duplicate(id: string, name?: string): Promise<ThemeDTO> {
    const res = await fetch(`/api/themes/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(name ? { name } : {}),
    });
    return unwrap<ThemeDTO>(res);
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/themes/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await unwrap(res);
  },

  async activate(id: string): Promise<ThemeDTO> {
    const res = await fetch('/api/themes/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    });
    return unwrap<ThemeDTO>(res);
  },
};
