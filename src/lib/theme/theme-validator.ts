import { z } from 'zod';

/**
 * Zod validation for theme configs. The Mongoose schema keeps the token groups
 * as Mixed (forward-compat); these schemas are the real structural guardrail at
 * the API boundary.
 */

// Accept hex (#abc / #aabbcc / #aabbccdd), rgb/rgba/hsl(a), or a CSS var().
const cssColor = z
  .string()
  .trim()
  .min(1)
  .refine(
    (v) =>
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
      /^(rgb|rgba|hsl|hsla)\(/i.test(v) ||
      /^var\(--/.test(v),
    { message: 'Must be a hex, rgb(a)/hsl(a), or var() color' }
  );

const cssSize = z.string().trim().min(1); // e.g. "16px", "1.5rem", "100%"
const fontStack = z.string().trim().min(1);

export const colorsSchema = z.object({
  primary: cssColor,
  secondary: cssColor,
  accent: cssColor,
  background: cssColor,
  surface: cssColor,
  text: cssColor,
  muted: cssColor,
  success: cssColor,
  warning: cssColor,
  danger: cssColor,
});

export const typographySchema = z.object({
  displayFont: fontStack,
  headingFont: fontStack,
  bodyFont: fontStack,
  baseFontSize: cssSize,
  lineHeight: z.string().trim().min(1),
});

export const spacingSchema = z.object({
  xs: cssSize,
  sm: cssSize,
  md: cssSize,
  lg: cssSize,
  xl: cssSize,
});

export const radiusSchema = z.object({
  sm: cssSize,
  md: cssSize,
  lg: cssSize,
  xl: cssSize,
  '2xl': cssSize,
});

export const shadowsSchema = z.object({
  sm: z.string().trim().min(1),
  md: z.string().trim().min(1),
  lg: z.string().trim().min(1),
  xl: z.string().trim().min(1),
});

export const layoutSchema = z.object({
  containerWidth: cssSize,
  sectionSpacing: cssSize,
});

export const themeConfigSchema = z.object({
  colors: colorsSchema,
  typography: typographySchema,
  spacing: spacingSchema,
  radius: radiusSchema,
  shadows: shadowsSchema,
  layout: layoutSchema,
});

export const componentVariantsSchema = z.record(z.string()).default({});

export const createThemeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).optional(),
  theme: themeConfigSchema,
  componentVariants: componentVariantsSchema.optional(),
  previewImage: z.string().trim().optional(),
  /** Optional: create by duplicating an existing theme id (handled in the route). */
  duplicateFrom: z.string().trim().optional(),
});

export const updateThemeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  theme: themeConfigSchema.partial().optional(),
  componentVariants: componentVariantsSchema.optional(),
  previewImage: z.string().trim().optional(),
});

export const activateThemeSchema = z.object({
  id: z.string().trim().min(1, 'Theme id is required'),
});

export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
