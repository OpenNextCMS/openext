import { randomUUID } from 'crypto';
import { themeLoader } from './ThemeLoader';
import {
  defaultsFromSchema,
  normalizeSectionSchema,
  parseThemeSectionContent,
  serializeThemeSectionContent,
} from './sectionSchema';
import type { ThemeEditableSection, ThemeManifest } from './types';

export type ThemeSectionCanvasBlock = {
  type: string;
  uniqueId: string;
  label?: string;
  content: string;
};

function id(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

/** Load block schemas for every editable section declared in the manifest. */
export async function loadSectionSchemasForTheme(
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

/**
 * Build CMS canvas blocks from a theme's `editableSections` manifest entries.
 * Merges schema defaults, section defaults, and any existing page blocks by sectionId.
 */
export function seedThemeSectionBlocks(input: {
  themeSlug: string;
  sections: ThemeEditableSection[];
  schemas: Record<string, ReturnType<typeof normalizeSectionSchema>>;
  existingBlocks?: unknown[];
}): ThemeSectionCanvasBlock[] {
  const existingBySectionId = new Map<
    string,
    { uniqueId: string; content: ReturnType<typeof parseThemeSectionContent> }
  >();

  for (const raw of input.existingBlocks || []) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as Record<string, unknown>;
    const parsed = parseThemeSectionContent(block.content);
    if (!parsed) continue;
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
