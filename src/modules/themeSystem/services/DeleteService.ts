import fs from 'fs/promises';
import path from 'path';
import { THEMES_DIR } from '../config';
import { ThemeRepository } from '../repositories/ThemeRepository';
import { invalidateTheme } from './CacheManager';
import { HookRegistry } from '../hooks/HookRegistry';
import { BackupService } from './BackupService';
import { ActiveThemeLockedError, ThemeNotFoundError } from '../errors';

/**
 * DeleteService — remove an installed theme (spec §11).
 *
 * Rules enforced:
 *   • The ACTIVE theme cannot be deleted — the caller must activate another first.
 *   • Deleting removes: theme files, the DB record, cached imports/assets, hooks,
 *     and rollback archives for that slug.
 */
export const DeleteService = {
  async remove(slug: string): Promise<{ slug: string }> {
    const theme = await ThemeRepository.findBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    if (theme.active) throw new ActiveThemeLockedError(slug);

    // 1. Files.
    const dir = path.join(THEMES_DIR, slug);
    await fs.rm(dir, { recursive: true, force: true });

    // 2. Rollback archives for this slug.
    for (const backup of await BackupService.list(slug)) {
      await BackupService.remove(backup);
    }

    // 3. DB record.
    await ThemeRepository.deleteBySlug(slug);

    // 4. Caches + hooks.
    invalidateTheme(slug);
    HookRegistry.clearTheme(slug);

    return { slug };
  },
};
