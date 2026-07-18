import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api/errors';
import { getPageDbConnection, getPageModel, getWebsitePreferencesModel } from '@/utils/db';
import { themeRegistry } from './ThemeRegistry';
import { themeLoader } from './ThemeLoader';
import { readDiskManifest } from './readDiskManifest';
import {
  defaultsFromSchema,
  normalizeSectionSchema,
  parseThemeSectionContent,
  serializeThemeSectionContent,
} from './sectionSchema';
import type { ThemeEditableSection, ThemeManifest } from './types';

export type EditorApplyMode = 'exact-editable';

type CanvasBlock = {
  type: string;
  uniqueId: string;
  label?: string;
  content: string;
  style?: Record<string, string>;
};

/**
 * Loads an uploaded Theme Engine package onto the homepage editor canvas.
 *
 * Always uses the exact theme render (theme-engine-frame → edit-aware preview).
 * When the package declares `editableSections`, those section blocks are seeded
 * (or merged by sectionId) so the inspector can edit content without converting
 * the theme into approximate generic CMS blocks.
 */
export const ThemeEngineEditorApplyService = {
  async applyToHomepage(slug: string): Promise<{
    pageId: string;
    slug: string;
    blockCount: number;
    mode: EditorApplyMode;
    hasEditableSections: boolean;
    header: string;
    footer: string;
  }> {
    const theme = await themeRegistry.getBySlug(slug);
    if (!theme || theme.status !== 'installed') {
      throw new ApiError('Theme not found or not installed', 404);
    }

    const pageDb = await getPageDbConnection();
    const Page = getPageModel(pageDb);
    const home = await findHomepage(Page);
    if (!home) {
      throw new ApiError(
        'No homepage found. Create a home page first, then load the theme into the editor.',
        404
      );
    }

    const manifest = ((await readDiskManifest(slug)) || theme.manifest) as ThemeManifest;
    const pageSlug = String(home.slug || 'home');
    const editableSections = manifest.editableSections || [];
    const hasEditableSections = editableSections.length > 0;

    let sectionBlocks: CanvasBlock[] = [];
    if (hasEditableSections) {
      const schemas = await loadSectionSchemas(slug, manifest);
      const existing = Array.isArray(home.component) ? home.component : [];
      sectionBlocks = seedEditableSections({
        themeSlug: slug,
        sections: editableSections,
        schemas,
        existingBlocks: existing,
      });
    }

    const frame: CanvasBlock = {
      type: 'theme-engine-frame',
      uniqueId: id('theme-engine-frame'),
      label: theme.name,
      content: JSON.stringify({
        slug: theme.slug,
        name: theme.name,
        version: theme.version,
        pageSlug,
        hasEditableSections,
        mode: 'exact-editable',
      }),
    };

    // Frame first for canvas detection; section data follows for persistence / public render.
    home.component = [frame, ...sectionBlocks];
    home.isPublished = true;
    await home.save();

    // Do not mutate global CMS header/footer records. Theme Engine pages suppress
    // them at render/load time and use the package partials exclusively, while
    // ordinary CMS pages can continue using their active global chrome.

    try {
      revalidatePath(`/${pageSlug}`);
      revalidatePath('/');
      revalidatePath('/Editor', 'page');
    } catch {
      // ignore
    }

    return {
      pageId: String(home._id),
      slug: pageSlug,
      blockCount: 1 + sectionBlocks.length,
      mode: 'exact-editable',
      hasEditableSections,
      header: 'theme-package',
      footer: 'theme-package',
    };
  },
};

function id(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function loadSectionSchemas(
  slug: string,
  manifest: ThemeManifest
): Promise<Record<string, ReturnType<typeof normalizeSectionSchema>>> {
  const out: Record<string, ReturnType<typeof normalizeSectionSchema>> = {};
  try {
    const loaded = await themeLoader.loadTheme(slug);
    for (const section of manifest.editableSections || []) {
      const registered = loaded.blocks[section.blockType];
      out[section.blockType] = normalizeSectionSchema(registered?.schema);
    }
  } catch {
    for (const section of manifest.editableSections || []) {
      out[section.blockType] = [];
    }
  }
  return out;
}

function seedEditableSections(input: {
  themeSlug: string;
  sections: ThemeEditableSection[];
  schemas: Record<string, ReturnType<typeof normalizeSectionSchema>>;
  existingBlocks: unknown[];
}): CanvasBlock[] {
  const existingBySectionId = new Map<string, { uniqueId: string; content: ReturnType<typeof parseThemeSectionContent> }>();

  for (const raw of input.existingBlocks) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    const parsed = parseThemeSectionContent(block.content);
    if (!parsed) continue;
    // Only reuse sections that belong to this theme (or have no slug yet).
    if (parsed.themeSlug && parsed.themeSlug !== input.themeSlug) continue;
    existingBySectionId.set(parsed.sectionId, {
      uniqueId: String(block.uniqueId || id(`theme-section-${parsed.sectionId}`)),
      content: parsed,
    });
  }

  return input.sections.map((section) => {
    const fields = input.schemas[section.blockType] || [];
    const schemaDefaults = defaultsFromSchema(fields);
    const existing = existingBySectionId.get(section.id);

    const data = {
      ...schemaDefaults,
      ...(section.defaults || {}),
      ...(existing?.content?.data || {}),
    };

    return {
      type: section.blockType,
      uniqueId: existing?.uniqueId || id(`theme-section-${section.id}`),
      label: section.label,
      content: serializeThemeSectionContent({
        sectionId: section.id,
        themeSlug: input.themeSlug,
        hidden: existing?.content?.hidden ?? Boolean(section.hiddenByDefault),
        data,
      }),
    };
  });
}

async function findHomepage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Page: any
) {
  let home = await Page.findOne({ isHome: true, pageType: 'page' }).exec();
  if (home) return home;

  try {
    const pageDb = await getPageDbConnection();
    const Prefs = getWebsitePreferencesModel(pageDb);
    const prefs = await Prefs.findOne({}).lean().exec();
    const homepageSlug = (prefs as { homepageSlug?: string } | null)?.homepageSlug;
    if (homepageSlug) {
      home = await Page.findOne({ slug: homepageSlug, pageType: 'page' }).exec();
      if (home) return home;
    }
  } catch {
    // optional
  }

  home = await Page.findOne({ slug: 'home', pageType: 'page' }).exec();
  if (home) return home;

  home = await Page.findOne({ slug: 'index', pageType: 'page' }).exec();
  if (home) return home;

  return Page.findOne({ pageType: 'page', isPublished: true }).sort({ updatedAt: -1 }).exec();
}
