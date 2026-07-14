import { ApiError } from '@/lib/api/errors';
import { invalidateActiveThemeCache } from '@/lib/theme/theme-cache';
import { mergeThemeConfig } from '@/lib/theme/cssVars.site';
import { ThemeRepository } from '../repositories/ThemeRepository';
import { removeThemeDirectory } from '../utils/storage';
import { isValidSemver } from '../utils/semver';
import { writeThemeFile } from '../utils/storage';
import type { ThemePackageUpdateInput } from '../types';
import type { ITheme, PartialThemeConfig } from '@/types/theme';
import path from 'path';

/**
 * ThemeRegistry — CRUD helpers for package themes (list/get/update/delete).
 * Complements ThemeService for Token-Builder themes; package-aware deletes clean storage.
 */
export const ThemeRegistry = {
  list: () => ThemeRepository.findAll(),
  getById: (id: string) => ThemeRepository.findById(id),
  getBySlug: (slug: string) => ThemeRepository.findBySlug(slug),
  getActive: () => ThemeRepository.findActive(),

  async update(id: string, input: ThemePackageUpdateInput): Promise<ITheme & { _id: string }> {
    const existing = await ThemeRepository.getDocument(id);
    if (!existing) throw new ApiError('Theme not found', 404);
    if (existing.isSystemTheme) {
      throw new ApiError('System themes are read-only. Duplicate it to edit.', 403);
    }

    if (input.name !== undefined) existing.name = input.name;
    if (input.description !== undefined) existing.description = input.description;
    if (input.author !== undefined) existing.author = input.author;
    if (input.previewImage !== undefined) existing.previewImage = input.previewImage;
    if (input.thumbnail !== undefined) existing.thumbnail = input.thumbnail;
    if (input.supports !== undefined) existing.supports = input.supports;

    if (input.version !== undefined) {
      if (!isValidSemver(input.version)) {
        throw new ApiError('version must be a semantic version (e.g. 1.2.0)', 400);
      }
      existing.version = input.version;
      existing.packageVersion = input.version;
    }

    if (input.theme !== undefined) {
      existing.theme = mergeThemeConfig({
        ...(existing.theme as PartialThemeConfig),
        ...input.theme,
      });
      // Keep tokens in sync so export + Theme Builder stay aligned
      existing.tokens = {
        ...(existing.tokens || {}),
        colors: existing.theme.colors,
        typography: existing.theme.typography,
        spacing: existing.theme.spacing,
        radius: existing.theme.radius,
        shadows: existing.theme.shadows,
        layout: existing.theme.layout,
      };
    }

    if (input.componentVariants !== undefined) {
      existing.componentVariants = input.componentVariants;
    }
    if (input.tokens !== undefined) {
      existing.tokens = { ...(existing.tokens || {}), ...input.tokens };
      existing.theme = mergeThemeConfig({
        ...(existing.theme as PartialThemeConfig),
        ...(input.tokens as PartialThemeConfig),
      });
    }
    if (input.templates !== undefined) {
      existing.templates = { ...(existing.templates || {}), ...input.templates };
    }
    if (input.layouts !== undefined) {
      existing.layouts = { ...(existing.layouts || {}), ...input.layouts };
    }
    if (input.presets !== undefined) {
      existing.presets = {
        blocks: { ...(existing.presets?.blocks || {}), ...(input.presets.blocks || {}) },
        styles: { ...(existing.presets?.styles || {}), ...(input.presets.styles || {}) },
      };
    }

    await existing.save();

    // Persist token files for package themes so disk mirrors Theme Builder edits
    if (existing.isPackageTheme && existing.tokens) {
      for (const [group, value] of Object.entries(existing.tokens as Record<string, unknown>)) {
        await writeThemeFile(
          existing.slug,
          path.posix.join('tokens', `${group}.json`),
          JSON.stringify(value, null, 2)
        );
      }
    }

    if (existing.isActive) invalidateActiveThemeCache();

    const plain = await ThemeRepository.findById(id);
    if (!plain) throw new ApiError('Theme not found', 404);
    return plain;
  },

  async delete(id: string): Promise<void> {
    const existing = await ThemeRepository.findById(id);
    if (!existing) throw new ApiError('Theme not found', 404);
    if (existing.isSystemTheme) {
      throw new ApiError('System themes cannot be deleted.', 403);
    }
    if (existing.isActive) {
      throw new ApiError('Cannot delete the active theme. Activate another theme first.', 409);
    }

    await ThemeRepository.deleteById(id);

    if (existing.isPackageTheme) {
      await removeThemeDirectory(existing.slug);
    }
  },
};
