import { apiUrl } from '@/lib/apiClient';
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
    const res = await fetch(apiUrl('/api/themes'), { credentials: 'include' });
    return unwrap<ThemeDTO[]>(res);
  },

  async get(id: string): Promise<ThemeDTO> {
    const res = await fetch(apiUrl(`/api/themes/${id}`), { credentials: 'include' });
    return unwrap<ThemeDTO>(res);
  },

  async create(payload: CreateThemePayload): Promise<ThemeDTO> {
    const res = await fetch(apiUrl('/api/themes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return unwrap<ThemeDTO>(res);
  },

  async update(id: string, payload: UpdateThemePayload): Promise<ThemeDTO> {
    const res = await fetch(apiUrl(`/api/themes/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    return unwrap<ThemeDTO>(res);
  },

  async duplicate(id: string, name?: string): Promise<ThemeDTO> {
    const res = await fetch(apiUrl(`/api/themes/${id}/duplicate`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(name ? { name } : {}),
    });
    return unwrap<ThemeDTO>(res);
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(apiUrl(`/api/themes/${id}`), {
      method: 'DELETE',
      credentials: 'include',
    });
    await unwrap(res);
  },

  async activate(
    id: string,
    opts?: { applyToEditor?: boolean }
  ): Promise<
    ThemeDTO & {
      appliedToEditor?: {
        pageId: string;
        slug: string;
        blockCount: number;
        header?: string;
        footer?: string;
      } | null;
    }
  > {
    const res = await fetch(apiUrl('/api/themes/activate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, applyToEditor: opts?.applyToEditor }),
    });
    return unwrap(res);
  },

  /** Finalize installation of an uploaded package theme. */
  async install(id: string): Promise<ThemeDTO> {
    const res = await fetch(apiUrl(`/api/themes/${id}/install`), {
      method: 'POST',
      credentials: 'include',
    });
    return unwrap<ThemeDTO>(res);
  },

  /**
   * Apply the theme's layouts/default (+ variants/presets) to the live homepage.
   * Optionally persist `applyPageLayout` so activation auto-applies next time.
   */
  async applyLayout(
    id: string,
    opts?: { layoutKey?: string; applyPageLayout?: boolean }
  ): Promise<{
    pageId: string;
    slug: string;
    blockCount: number;
    header?: string;
    footer?: string;
    message?: string;
  }> {
    const res = await fetch(apiUrl(`/api/themes/${id}/apply-layout`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(opts || {}),
    });
    return unwrap(res);
  },

  /** Toggle “match homepage to this theme’s layout” without rewriting pages yet. */
  async setApplyPageLayout(id: string, applyPageLayout: boolean): Promise<ThemeDTO> {
    const res = await fetch(apiUrl(`/api/themes/${id}/apply-layout`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ applyPageLayout }),
    });
    return unwrap<ThemeDTO>(res);
  },

  /** Download the theme as a portable ZIP (includes Theme Builder customizations). */
  async exportZip(id: string): Promise<Blob> {
    const res = await fetch(apiUrl(`/api/themes/${id}/export`), { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error?.message || `Export failed (${res.status})`);
    }
    return res.blob();
  },
};
