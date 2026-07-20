/** Client-side theme types (mirror of the server InstalledTheme record). */

export type ThemeStatus = 'installed' | 'corrupted' | 'updating';

export interface InstalledTheme {
  _id: string;
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  license?: string;
  thumbnail: string;
  path: string;
  status: ThemeStatus;
  installed: boolean;
  active: boolean;
  settings: Record<string, unknown>;
  minimumCMSVersion?: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  error: { code: string; message: string; details?: Record<string, unknown> } | null;
}

export type SortKey = 'name' | 'recent' | 'version';
export type StatusFilter = 'all' | 'active' | 'installed' | 'corrupted';
