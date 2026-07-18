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

  /** Import a theme from a parsed JSON token package. Created as an inactive custom theme. */
  async importTheme(pkg: unknown): Promise<ThemeDTO> {
    const res = await fetch('/api/themes/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(pkg),
    });
    return unwrap<ThemeDTO>(res);
  },

  /**
   * Import a theme from an uploaded file — a `.json` token package or a `.zip`
   * bundle (theme.json + optional preview). The server unpacks and validates it.
   * Sent as multipart; the browser sets the Content-Type boundary itself.
   */
  async importFile(file: File): Promise<ThemeDTO> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/themes/import', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    return unwrap<ThemeDTO>(res);
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
    const res = await fetch('/api/themes/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, applyToEditor: opts?.applyToEditor }),
    });
    return unwrap(res);
  },

  /** Upload a full theme package ZIP (Theme Package Manager). */
  async uploadPackage(file: File): Promise<ThemeDTO> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/themes/upload', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    return unwrap<ThemeDTO>(res);
  },

  /** Finalize installation of an uploaded package theme. */
  async install(id: string): Promise<ThemeDTO> {
    const res = await fetch(`/api/themes/${id}/install`, {
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
    const res = await fetch(`/api/themes/${id}/apply-layout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(opts || {}),
    });
    return unwrap(res);
  },

  /** Toggle “match homepage to this theme’s layout” without rewriting pages yet. */
  async setApplyPageLayout(id: string, applyPageLayout: boolean): Promise<ThemeDTO> {
    const res = await fetch(`/api/themes/${id}/apply-layout`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ applyPageLayout }),
    });
    return unwrap<ThemeDTO>(res);
  },

  /** Download the theme as a portable ZIP (includes Theme Builder customizations). */
  async exportZip(id: string): Promise<Blob> {
    const res = await fetch(`/api/themes/${id}/export`, { credentials: 'include' });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new Error(json?.error?.message || `Export failed (${res.status})`);
    }
    return res.blob();
  },
};
