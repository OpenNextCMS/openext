import { getPageDbConnection, getThemeModel } from '@/utils/db';
import { generateUniqueSlug } from '@/lib/api/slug';
import { ApiError } from '@/lib/api/errors';
import { mergeThemeConfig } from './cssVars.site';
import { invalidateActiveThemeCache } from './theme-cache';
import type { ITheme, ThemeConfig, PartialThemeConfig } from '@/types/theme';
import type { ComponentVariants } from '@/types/component-variants';

/**
 * ThemeService — CRUD + duplicate + activate for site-wide themes. Every query
 * is scoped to the per-tenant page DB. System themes (`isSystemTheme`) are
 * read-only: they can be duplicated and activated, but not edited or deleted.
 */

export interface CreateThemeData {
  name: string;
  description?: string;
  theme: ThemeConfig;
  componentVariants?: ComponentVariants;
  previewImage?: string;
}

export interface UpdateThemeData {
  name?: string;
  description?: string;
  theme?: PartialThemeConfig;
  componentVariants?: ComponentVariants;
  previewImage?: string;
}

function toPlain(doc: unknown): ITheme & { _id: string } {
  const d = doc as ITheme & { _id: unknown };
  return { ...d, _id: String(d._id) };
}

export const ThemeService = {
  async list(): Promise<(ITheme & { _id: string })[]> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const docs = await Theme.find({})
      .sort({ isSystemTheme: -1, updatedAt: -1 })
      .lean()
      .exec();
    return docs.map(toPlain);
  },

  async getById(id: string): Promise<(ITheme & { _id: string }) | null> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = await Theme.findById(id).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async create(
    tenantId: string,
    data: CreateThemeData,
    userId?: string
  ): Promise<ITheme & { _id: string }> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const slug = await generateUniqueSlug(Theme, data.name);
    const created = await Theme.create({
      tenantId,
      name: data.name,
      slug,
      description: data.description ?? '',
      isSystemTheme: false,
      isDefault: false,
      isActive: false,
      version: '1.0.0',
      previewImage: data.previewImage ?? '',
      theme: mergeThemeConfig(data.theme),
      componentVariants: data.componentVariants ?? {},
      createdBy: userId,
    });
    return toPlain(created.toObject());
  },

  /** Duplicate any theme (incl. a system theme) into a new editable custom theme. */
  async duplicate(
    tenantId: string,
    sourceId: string,
    userId?: string,
    nameOverride?: string
  ): Promise<ITheme & { _id: string }> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const source = await Theme.findById(sourceId).lean().exec();
    if (!source) throw new ApiError('Theme not found', 404);
    const src = source as unknown as ITheme;

    const name = nameOverride?.trim() || `${src.name} (Copy)`;
    const slug = await generateUniqueSlug(Theme, name);
    const created = await Theme.create({
      tenantId,
      name,
      slug,
      description: src.description ?? '',
      isSystemTheme: false,
      isDefault: false,
      isActive: false,
      version: '1.0.0',
      previewImage: src.previewImage ?? '',
      theme: mergeThemeConfig(src.theme),
      componentVariants: src.componentVariants ?? {},
      createdBy: userId,
    });
    return toPlain(created.toObject());
  },

  async update(id: string, data: UpdateThemeData): Promise<ITheme & { _id: string }> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const existing = await Theme.findById(id).exec();
    if (!existing) throw new ApiError('Theme not found', 404);
    if (existing.isSystemTheme) {
      throw new ApiError('System themes are read-only. Duplicate it to edit.', 403);
    }

    if (data.name !== undefined) existing.name = data.name;
    if (data.description !== undefined) existing.description = data.description;
    if (data.previewImage !== undefined) existing.previewImage = data.previewImage;
    if (data.theme !== undefined) {
      existing.theme = mergeThemeConfig({ ...(existing.theme as PartialThemeConfig), ...data.theme });
    }
    if (data.componentVariants !== undefined) {
      existing.componentVariants = data.componentVariants;
    }

    // Keep package tokens in sync so Theme Builder edits remain exportable.
    if (data.theme !== undefined && existing.isPackageTheme) {
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

    await existing.save();

    // If the edited theme is the active one, drop the cached copy.
    if (existing.isActive) invalidateActiveThemeCache();
    return toPlain(existing.toObject());
  },

  async delete(id: string): Promise<void> {
    // Package-aware delete (cleans storage/themes/{slug} for ZIP themes).
    const { ThemeRegistry } = await import('@/modules/theme/services/ThemeRegistry');
    await ThemeRegistry.delete(id);
  },

  /** Make exactly one theme active (unsets all others), then bust the cache. */
  async activate(
    id: string,
    opts?: { applyToEditor?: boolean }
  ): Promise<ITheme & { _id: string }> {
    // Package-aware activation (WebsitePreferences, header/footer, ISR, cache).
    const { ThemeActivationService } = await import(
      '@/modules/theme/services/ThemeActivationService'
    );
    const result = await ThemeActivationService.activate(id, opts);
    return result.theme;
  },

  /** Activate a theme by its slug (e.g. a system theme like 'startup' or 'dark'). */
  async activateBySlug(slug: string): Promise<ITheme & { _id: string }> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const target = await Theme.findOne({ slug }).exec();
    if (!target) throw new ApiError(`Theme with slug '${slug}' not found`, 404);
    return this.activate(String(target._id));
  },
};
