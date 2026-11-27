import { defaultsFromSchema, normalizeSectionSchema } from './sectionSchema';
import type { CmsBlock, LoadedTheme } from './types';

/**
 * Build synthetic CMS blocks for theme-only previews (gallery card / full
 * preview). Uses `editableSections` when declared; otherwise every loaded
 * block type in manifest order. Field values come from schema defaults.
 */
export function previewBlocksFromLoadedTheme(loaded: LoadedTheme): CmsBlock[] {
  const sections = loaded.manifest.editableSections || [];

  if (sections.length > 0) {
    const out: CmsBlock[] = [];
    for (const section of sections) {
      if (section.hiddenByDefault) continue;
      const registered = loaded.blocks[section.blockType];
      if (!registered?.Renderer) continue;

      const fields = normalizeSectionSchema(registered.schema);
      const data = {
        ...defaultsFromSchema(fields),
        ...(section.defaults || {}),
      };

      out.push({
        id: `preview-${section.id}`,
        type: section.blockType,
        data,
      });
    }
    return out;
  }

  // Themes without editableSections: still preview every registered block once.
  const out: CmsBlock[] = [];
  for (const declared of loaded.manifest.blocks || []) {
    const registered = loaded.blocks[declared.type];
    if (!registered?.Renderer) continue;
    const fields = normalizeSectionSchema(registered.schema);
    out.push({
      id: `preview-${declared.type}`,
      type: declared.type,
      data: defaultsFromSchema(fields),
    });
  }
  return out;
}
