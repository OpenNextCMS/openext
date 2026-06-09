import type { Connection } from 'mongoose';
import { getThemeModel } from '@/utils/db';
import { SYSTEM_THEMES } from '@/themes';
import { resolveTenantId } from './tenant';

/**
 * Idempotently install the in-code system themes into a tenant's page DB.
 *
 * - Upserts each system theme by slug (so re-running picks up palette edits).
 * - Marks the first system theme (Startup) as the default.
 * - Ensures exactly one theme is active: if no theme is active yet, the default
 *   becomes active. An already-active (possibly custom) theme is left untouched.
 *
 * Safe to call on every fresh tenant DB (see the auto-seed in db.ts) and from
 * the manual `scripts/seedThemes.ts`.
 */
export async function seedSystemThemes(pageDb: Connection): Promise<void> {
  const Theme = getThemeModel(pageDb);
  const tenantId = resolveTenantId();

  const hasActive = (await Theme.exists({ isActive: true })) != null;

  for (let i = 0; i < SYSTEM_THEMES.length; i++) {
    const def = SYSTEM_THEMES[i];
    const isDefault = i === 0;

    await Theme.updateOne(
      { slug: def.slug },
      {
        $set: {
          name: def.name,
          description: def.description,
          isSystemTheme: true,
          isDefault,
          previewImage: def.previewImage,
          version: '1.0.0',
          theme: def.theme,
          componentVariants: def.componentVariants,
          meta: def.meta ?? {},
          tenantId,
        },
        // Only set isActive on insert for the default theme; never override an
        // existing active selection on update.
        $setOnInsert: { isActive: isDefault && !hasActive },
      },
      { upsert: true }
    );
  }
}
