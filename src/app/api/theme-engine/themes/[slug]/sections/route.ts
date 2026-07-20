import { NextRequest } from 'next/server';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { getAuthUser } from '@/lib/api/auth';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { themeLoader } from '@/modules/themeEngine/ThemeLoader';
import { readDiskManifest } from '@/modules/themeEngine/readDiskManifest';
import { normalizeSectionSchema } from '@/modules/themeEngine/sectionSchema';

/** GET /api/theme-engine/themes/[slug]/sections — editable section schemas for the inspector. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await getAuthUser();
    if (!user) throw new ApiError('Unauthorized', 401);

    const { slug } = await params;
    const theme = await themeRegistry.getBySlug(slug);
    if (!theme || theme.status !== 'installed') {
      throw new ApiError('Theme not found', 404);
    }

    const manifest = (await readDiskManifest(slug)) || theme.manifest;
    const editableSections = manifest.editableSections || [];
    let loadedSchemas: Record<string, unknown> = {};
    try {
      const loaded = await themeLoader.loadTheme(slug);
      loadedSchemas = Object.fromEntries(
        Object.entries(loaded.blocks).map(([type, block]) => [type, block.schema])
      );
    } catch {
      loadedSchemas = {};
    }

    const sections = editableSections.map((section) => ({
      id: section.id,
      label: section.label,
      blockType: section.blockType,
      hiddenByDefault: Boolean(section.hiddenByDefault),
      fields: normalizeSectionSchema(loadedSchemas[section.blockType]),
      defaults: section.defaults || {},
    }));

    return apiOk({
      slug,
      name: manifest.name || theme.name,
      hasEditableSections: sections.length > 0,
      themeSettings: manifest.themeSettings || [],
      sections,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
