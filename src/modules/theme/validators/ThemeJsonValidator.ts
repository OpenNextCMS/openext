import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { isValidSemver } from '../utils/semver';
import { isValidThemeSlug, sanitizeThemeSlug } from '../utils/pathSafety';
import type { ThemePackageMeta } from '../types';

const supportsSchema = z.array(z.string().trim().min(1).max(64)).max(32).optional();

/**
 * Zod schema for package root theme.json metadata.
 * Accepts the full package format and remains tolerant of the legacy token envelope.
 */
export const themeJsonMetaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(3).max(64).optional(),
  version: z
    .string()
    .trim()
    .refine((v) => isValidSemver(v), { message: 'version must be a semantic version (e.g. 1.0.0)' }),
  author: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  preview: z.string().trim().max(260).optional(),
  thumbnail: z.string().trim().max(260).optional(),
  compatibleCms: z.string().trim().max(64).optional(),
  supports: supportsSchema,
  format: z.string().trim().max(64).optional(),
  /** When true, activation also applies layouts/default to the homepage. */
  applyPageLayout: z.boolean().optional(),
});

export type ThemeJsonMetaInput = z.infer<typeof themeJsonMetaSchema>;

/** Validate + normalize theme.json metadata. Throws ApiError/ZodError. */
export function validateThemeJson(raw: unknown, fallbackName?: string): ThemePackageMeta {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('theme.json must be a JSON object.', 400);
  }

  const obj = raw as Record<string, unknown>;

  // Legacy token packages may omit version — default to 1.0.0
  const withDefaults = {
    ...obj,
    name:
      typeof obj.name === 'string' && obj.name.trim()
        ? obj.name
        : fallbackName || 'Imported Theme',
    version:
      typeof obj.version === 'string' && obj.version.trim()
        ? // Accept numeric legacy "version: 1" by coercing later
          obj.version
        : typeof obj.version === 'number'
          ? `${obj.version}.0.0`
          : '1.0.0',
  };

  // If version was a bare major from legacy format number already handled; if still "1" from string
  if (/^\d+$/.test(String(withDefaults.version))) {
    withDefaults.version = `${withDefaults.version}.0.0`;
  }

  const parsed = themeJsonMetaSchema.parse(withDefaults);
  const slug = sanitizeThemeSlug(parsed.slug || parsed.name);

  if (!isValidThemeSlug(slug)) {
    throw new ApiError(
      'theme.json "slug" must be 3–64 chars of lowercase letters, numbers, and hyphens.',
      400
    );
  }

  return {
    name: parsed.name,
    slug,
    version: parsed.version,
    author: parsed.author,
    description: parsed.description,
    preview: parsed.preview,
    thumbnail: parsed.thumbnail,
    compatibleCms: parsed.compatibleCms,
    supports: parsed.supports ?? [],
    applyPageLayout: parsed.applyPageLayout,
    format: parsed.format,
  };
}
