import { ThemeRepository, type InstalledThemeRecord } from '../repositories/ThemeRepository';
import { InstallService } from '../services/InstallService';
import { ActivationService } from '../services/ActivationService';
import { UpdateService } from '../services/UpdateService';
import { DeleteService } from '../services/DeleteService';
import { ThemeEditorService } from '../services/ThemeEditorService';
import { invalidateTheme } from '../services/CacheManager';
import { ThemeNotFoundError } from '../errors';
import type { InstallLogger, ThemeOperationContext } from '../types';

/**
 * ThemeController — thin orchestration layer between HTTP route handlers and the
 * services (SRP: no business logic here, no HTTP here). Each method maps 1:1 to
 * an endpoint in spec §9.
 */
export const ThemeController = {
  /** GET /api/theme-system — list installed themes. */
  async list(): Promise<InstalledThemeRecord[]> {
    return ThemeRepository.findAll();
  },

  /** GET /api/theme-system/active — currently active theme (or null). */
  async active(): Promise<InstalledThemeRecord | null> {
    return ActivationService.getActive();
  },

  /** GET /api/theme-system/:slug — theme details for the preview panel. */
  async details(slug: string): Promise<InstalledThemeRecord> {
    const theme = await ThemeRepository.findBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return theme;
  },

  /** POST /api/theme-system/upload — install from a ZIP. */
  async upload(buffer: Buffer, ctx: ThemeOperationContext, logger?: InstallLogger): Promise<InstalledThemeRecord> {
    return InstallService.install(buffer, ctx, logger);
  },

  /** POST /api/theme-system/activate/:slug — single-active switch. */
  async activate(slug: string): Promise<InstalledThemeRecord> {
    return ActivationService.activate(slug);
  },

  /** PUT /api/theme-system/update/:slug — update to a newer version (rollback-safe). */
  async update(slug: string, buffer: Buffer, ctx: ThemeOperationContext, logger?: InstallLogger): Promise<InstalledThemeRecord> {
    return UpdateService.update(slug, buffer, ctx, logger);
  },

  /** DELETE /api/theme-system/:slug — remove (active theme is protected). */
  async remove(slug: string): Promise<{ slug: string }> {
    return DeleteService.remove(slug);
  },

  /** PATCH /api/theme-system/:slug — persist Theme Options values (auto page, §1/§14). */
  async updateSettings(slug: string, settings: Record<string, unknown>): Promise<InstalledThemeRecord> {
    const existing = await ThemeRepository.findBySlug(slug);
    if (!existing) throw new ThemeNotFoundError(slug);
    const merged = { ...(existing.settings ?? {}), ...settings };
    const updated = await ThemeRepository.updateBySlug(slug, { settings: merged });
    if (!updated) throw new ThemeNotFoundError(slug);
    invalidateTheme(slug);
    return updated;
  },

  /** GET /api/theme-system/:slug/files — editable file tree (Theme Editor, §13). */
  async listFiles(slug: string): Promise<string[]> {
    return ThemeEditorService.listFiles(slug);
  },

  /** GET /api/theme-system/:slug/file?path= — read a file's content. */
  async readFile(slug: string, filePath: string): Promise<{ path: string; content: string }> {
    return ThemeEditorService.readFile(slug, filePath);
  },

  /** PUT /api/theme-system/:slug/file — write a file's content. */
  async writeFile(slug: string, filePath: string, content: string): Promise<{ path: string }> {
    return ThemeEditorService.writeFile(slug, filePath, content);
  },
};
