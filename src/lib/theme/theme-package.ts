import { ApiError } from '@/lib/api/errors';
import { mergeThemeConfig } from './cssVars.site';
import { themeConfigSchema, componentVariantsSchema } from './theme-validator';
import type { ThemeConfig, PartialThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Theme package (import) format.
 *
 * A theme "package" is a small JSON document describing a Theme Builder theme by
 * its design tokens — NOT code. It round-trips the fields `ThemeService.create`
 * accepts. Imports are intentionally forgiving:
 *   • a `{ theme: {...} }` envelope OR a bare token config are both accepted;
 *   • partial configs are merged onto DEFAULT_THEME_CONFIG so gaps are filled;
 *   • the merged config is then structurally validated (bad colors, etc. → 400).
 */

export const THEME_PACKAGE_FORMAT = 'nextcms-theme';
export const THEME_PACKAGE_VERSION = 1;

const CONFIG_GROUPS = ['colors', 'typography', 'spacing', 'radius', 'shadows', 'layout'] as const;

/** Cap on an embedded preview image string (data/URL) so imports stay lightweight. */
const MAX_PREVIEW_IMAGE_CHARS = 200_000;

export interface NormalizedThemePackage {
  name: string;
  description?: string;
  theme: ThemeConfig;
  componentVariants: ComponentVariants;
  previewImage?: string;
}

/** Pull the token config out of a package, tolerating `{ theme: {...} }` or a bare config. */
function extractConfig(raw: Record<string, unknown>): PartialThemeConfig {
  if (raw.theme && typeof raw.theme === 'object' && !Array.isArray(raw.theme)) {
    return raw.theme as PartialThemeConfig;
  }
  // Bare config: the object itself carries one or more token groups.
  if (CONFIG_GROUPS.some((g) => g in raw)) {
    return raw as PartialThemeConfig;
  }
  throw new ApiError('Not a valid theme file: no theme tokens found.', 400);
}

/**
 * Validate + normalize an uploaded theme package into the exact shape
 * `ThemeService.create` expects. Throws ApiError (400) or ZodError on bad input;
 * both map to a clean 400 via `handleApiError`.
 */
export function normalizeThemePackage(
  raw: unknown,
  opts?: { fallbackName?: string }
): NormalizedThemePackage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError('Invalid theme file: expected a JSON object.', 400);
  }
  const obj = raw as Record<string, unknown>;

  // Merge partial → full, then structurally validate (catches bad color values, etc.).
  const merged = mergeThemeConfig(extractConfig(obj));
  const theme = themeConfigSchema.parse(merged);

  const rawName = typeof obj.name === 'string' ? obj.name.trim() : '';
  const name = (rawName || opts?.fallbackName?.trim() || 'Imported Theme').slice(0, 80);

  const description =
    typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim().slice(0, 500)
      : undefined;

  const componentVariants = componentVariantsSchema.parse(
    obj.componentVariants && typeof obj.componentVariants === 'object' ? obj.componentVariants : {}
  ) as ComponentVariants;

  const rawPreview = typeof obj.previewImage === 'string' ? obj.previewImage : '';
  const previewImage =
    rawPreview && rawPreview.length <= MAX_PREVIEW_IMAGE_CHARS ? rawPreview : undefined;

  return { name, description, theme, componentVariants, previewImage };
}
