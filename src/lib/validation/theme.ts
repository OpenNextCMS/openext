import { z } from 'zod';

export const themeSettingsSchema = z.object({
  typography: z
    .object({
      headingFont: z.string(),
      bodyFont: z.string(),
      baseSize: z.number().min(10).max(28),
      lineHeight: z.number().min(1).max(2.5),
    })
    .partial()
    .optional(),
  colors: z
    .object({
      primary: z.string(),
      background: z.string(),
      text: z.string(),
      accent: z.string(),
    })
    .partial()
    .optional(),
  layout: z
    .object({
      width: z.enum(['full', 'boxed']),
      maxWidth: z.number().min(600).max(1920),
    })
    .partial()
    .optional(),
  radius: z.number().min(0).max(40).optional(),
  cardStyle: z.enum(['flat', 'shadow', 'bordered']).optional(),
  sidebarPosition: z.enum(['left', 'right', 'none']).optional(),
  darkMode: z.enum(['light', 'dark', 'auto']).optional(),
});
