import type { ThemeConfig, SystemThemeId } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';
import startup from './startup';
import agency from './agency';
import corporate from './corporate';
import ecommerce from './ecommerce';
import portfolio from './portfolio';

/** Shape of an in-code system (default) theme definition. */
export interface SystemThemeDef {
  slug: SystemThemeId;
  name: string;
  description: string;
  isSystemTheme: true;
  previewImage: string;
  theme: ThemeConfig;
  componentVariants: ComponentVariants;
}

/**
 * The ordered list of system themes. The first entry is seeded as the default
 * and initially-active theme for a fresh tenant DB.
 */
export const SYSTEM_THEMES: SystemThemeDef[] = [
  startup,
  agency,
  corporate,
  ecommerce,
  portfolio,
];

export function getSystemTheme(slug: string): SystemThemeDef | undefined {
  return SYSTEM_THEMES.find((t) => t.slug === slug);
}
