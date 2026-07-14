import { ApiError } from '@/lib/api/errors';
import {
  colorsSchema,
  typographySchema,
  spacingSchema,
  radiusSchema,
  shadowsSchema,
  layoutSchema,
  themeConfigSchema,
  componentVariantsSchema,
} from '@/lib/theme/theme-validator';
import { mergeThemeConfig } from '@/lib/theme/cssVars.site';
import type { ThemeConfig, PartialThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * Validates design-token payloads (from tokens/*.json or inline theme).
 * Reuses the existing Theme Builder Zod schemas so package + builder stay aligned.
 */

const TOKEN_FILE_SCHEMAS = {
  colors: colorsSchema.partial(),
  typography: typographySchema.partial(),
  spacing: spacingSchema.partial(),
  radius: radiusSchema.partial(),
  shadows: shadowsSchema.partial(),
  layout: layoutSchema.partial(),
} as const;

export type TokenGroupName = keyof typeof TOKEN_FILE_SCHEMAS;

export function isTokenGroupName(name: string): name is TokenGroupName {
  return name in TOKEN_FILE_SCHEMAS;
}

export function validateTokenGroup(group: TokenGroupName, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError(`tokens/${group}.json must be a JSON object.`, 400);
  }
  return TOKEN_FILE_SCHEMAS[group].parse(raw) as Record<string, unknown>;
}

/** Merge validated token groups + optional inline theme into a full ThemeConfig. */
export function mergeAndValidateTokens(
  tokens: PartialThemeConfig,
  inlineTheme?: PartialThemeConfig
): ThemeConfig {
  const merged = mergeThemeConfig({
    ...tokens,
    ...(inlineTheme || {}),
    colors: { ...(tokens.colors || {}), ...(inlineTheme?.colors || {}) },
    typography: { ...(tokens.typography || {}), ...(inlineTheme?.typography || {}) },
    spacing: { ...(tokens.spacing || {}), ...(inlineTheme?.spacing || {}) },
    radius: { ...(tokens.radius || {}), ...(inlineTheme?.radius || {}) },
    shadows: { ...(tokens.shadows || {}), ...(inlineTheme?.shadows || {}) },
    layout: { ...(tokens.layout || {}), ...(inlineTheme?.layout || {}) },
  });
  return themeConfigSchema.parse(merged);
}

export function validateComponentVariants(raw: unknown): ComponentVariants {
  return componentVariantsSchema.parse(
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  ) as ComponentVariants;
}
