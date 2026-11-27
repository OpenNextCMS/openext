import type { IThemeEngineThemeDocument } from './models/Theme';
import { extractTemplateMetadata } from './templateMetadata';
import { buildScreenshotUrl } from './themeAssetPaths';
import type { ThemeTemplateMeta } from './types';

export interface ThemeDetailPayload {
  slug: string;
  name: string;
  author: string;
  version: string;
  description: string;
  status: string;
  compatibleCmsVersion: string;
  installedAt: Date;
  updatedAt: Date;
  isActive: boolean;
  templateCount: number;
  blockCount: number;
  partialCount: number;
  templates: ThemeTemplateMeta[];
  partials: Record<string, string>;
  blocks: { type: string; rendererPath: string }[];
  assets: { css?: string; js?: string };
  screenshotUrl: string;
  supports: Record<string, boolean>;
  previousThemeSlug: string | null;
}

export function toThemeDetail(
  theme: IThemeEngineThemeDocument,
  activeSlug: string | null,
  previousThemeSlug: string | null = null
): ThemeDetailPayload {
  const templates =
    (Array.isArray(theme.templates) && theme.templates.length > 0
      ? theme.templates
      : extractTemplateMetadata(theme.manifest)) as ThemeTemplateMeta[];

  const partials =
    theme.partials && typeof theme.partials === 'object'
      ? (theme.partials as Record<string, string>)
      : (theme.manifest.partials as Record<string, string>);

  const blocks = (theme.manifest.blocks ?? []).map((b) => ({
    type: b.type,
    rendererPath: b.rendererPath,
  }));

  const manifest = theme.manifest as { screenshot?: string; supports?: Record<string, boolean> };

  return {
    slug: theme.slug,
    name: theme.name,
    author: theme.author,
    version: theme.version,
    description: theme.description ?? '',
    status: activeSlug === theme.slug ? 'active' : theme.status,
    compatibleCmsVersion: theme.compatibleCmsVersion,
    installedAt: theme.installedAt,
    updatedAt: theme.updatedAt,
    isActive: activeSlug === theme.slug,
    templateCount: templates.length,
    blockCount: blocks.length,
    partialCount: Object.keys(partials ?? {}).length,
    templates,
    partials,
    blocks,
    assets: (theme.assets as { css?: string; js?: string }) ?? { css: 'assets/style.css', js: 'assets/theme.js' },
    screenshotUrl: buildScreenshotUrl(theme.slug, manifest.screenshot),
    supports: manifest.supports ?? {},
    previousThemeSlug,
  };
}

export function toThemeListItem(
  theme: IThemeEngineThemeDocument,
  activeSlug: string | null
) {
  const templates =
    (Array.isArray(theme.templates) && theme.templates.length > 0
      ? theme.templates
      : extractTemplateMetadata(theme.manifest)) as ThemeTemplateMeta[];

  const partials =
    theme.partials && typeof theme.partials === 'object'
      ? (theme.partials as Record<string, string>)
      : (theme.manifest.partials as Record<string, string>);

  const blocks = theme.manifest.blocks ?? [];
  const manifest = theme.manifest as { screenshot?: string; supports?: Record<string, boolean> };

  return {
    slug: theme.slug,
    name: theme.name,
    author: theme.author,
    version: theme.version,
    description: theme.description || '',
    status: activeSlug === theme.slug ? 'active' : theme.status,
    installedAt: theme.installedAt,
    updatedAt: theme.updatedAt,
    templateCount: templates.length,
    blockCount: blocks.length,
    partialCount: Object.keys(partials ?? {}).length,
    isActive: activeSlug === theme.slug,
    screenshotUrl: buildScreenshotUrl(theme.slug, manifest.screenshot),
    supports: manifest.supports ?? {},
  };
}
