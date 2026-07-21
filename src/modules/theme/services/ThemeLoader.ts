import { getActiveTheme as loadActiveFromLib } from '@/lib/theme/theme-loader';
import { ThemeAssetService } from './ThemeAssetService';
import { ThemeRepository } from '../repositories/ThemeRepository';
import type { ActiveTheme } from '@/lib/theme/theme-cache';

export interface ActivePackageTheme extends ActiveTheme {
  author: string | null;
  assetsPath: string | null;
  cssUrls: string[];
  supports: string[];
  layouts: Record<string, unknown>;
  presets: {
    blocks: Record<string, unknown>;
    styles: Record<string, unknown>;
  };
  isPackageTheme: boolean;
}

/**
 * ThemeLoader — package-aware active theme loader for public pages / builders.
 * Extends the base token loader with CSS asset URLs and presets.
 */
export const ThemeLoader = {
  async getActive(): Promise<ActivePackageTheme> {
    const base = await loadActiveFromLib();
    const empty: ActivePackageTheme = {
      ...base,
      author: null,
      assetsPath: null,
      cssUrls: [],
      supports: [],
      layouts: {},
      presets: { blocks: {}, styles: {} },
      isPackageTheme: false,
    };

    if (!base.id) return empty;

    const doc = await ThemeRepository.findById(base.id);
    if (!doc) return empty;

    let cssUrls: string[] = [];
    if (doc.isPackageTheme && doc.slug) {
      try {
        cssUrls = await ThemeAssetService.listStylesheets(doc.slug);
      } catch {
        cssUrls = [];
      }
    }

    return {
      ...base,
      author: doc.author || null,
      assetsPath: doc.assetsPath || null,
      cssUrls,
      supports: doc.supports || [],
      layouts: (doc.layouts as Record<string, unknown>) || {},
      presets: {
        blocks: doc.presets?.blocks || {},
        styles: doc.presets?.styles || {},
      },
      isPackageTheme: !!doc.isPackageTheme,
    };
  },
};
