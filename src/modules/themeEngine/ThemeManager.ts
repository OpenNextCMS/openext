import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { Types } from 'mongoose';
import { themeInstaller, type ThemeInstaller } from './ThemeInstaller';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import { themeRenderer, type ThemeRenderer } from './ThemeRenderer';
import { themePreviewService, type ThemePreviewService } from './ThemePreviewService';
import { themeCustomizationRepository } from './repositories/ThemeCustomizationRepository';
import { flattenSettingsSchema, defaultsFromSettingsSchema } from './settingsSchema';
import { DEFAULT_THEME_SLUG, DEFAULT_THEME_SOURCE_DIR, MANIFEST_FILENAME, THEMES_ROOT, COMPILED_ROOT } from './config';
import type { IThemeEngineThemeDocument } from './models/Theme';
import type { RenderInput, RenderResult, ThemePreviewTicket } from './types';
import { ThemeEngineError, ThemeNotFoundError } from './errors';

/** Well-known id attributed to installs `ThemeManager` performs itself (the default theme), never a real user. */
const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000000');

/**
 * §4.13 ThemeManager — the single public facade the rest of the app calls.
 * Wires together every other module and owns the ONE piece of policy the
 * spec doesn't delegate elsewhere: `renderPage()`'s fallback-to-default-theme
 * behavior.
 *
 *   1. Try `ThemeRenderer.render(input)` against the resolved theme.
 *   2. On ANY thrown error: log full context, then retry
 *      `ThemeRenderer.render()` forcing the built-in default theme.
 *   3. If the default theme ALSO fails, that's a hard failure — rethrow,
 *      do not recurse further.
 *
 * The default theme is installed through the exact same `ThemeInstaller`
 * pipeline as any uploaded theme (from source shipped in-repo) — there is no
 * special-cased "if fallback then render this hardcoded JSX" branch.
 */
export class ThemeManager {
  constructor(
    private readonly installer: ThemeInstaller = themeInstaller,
    private readonly registry: ThemeRegistry = themeRegistry,
    private readonly renderer: ThemeRenderer = themeRenderer,
    private readonly preview: ThemePreviewService = themePreviewService
  ) {}

  async uploadAndInstall(
    zip: Buffer,
    userId: Types.ObjectId | string,
    opts: { replace?: boolean } = {}
  ): Promise<IThemeEngineThemeDocument> {
    return this.installer.install(zip, { installedBy: userId, replace: opts.replace });
  }

  async activate(slug: string, userId: Types.ObjectId | string): Promise<void> {
    await this.registry.activate(slug, userId);
  }

  /** Restore the theme that was active before the most recent activation. */
  async rollback(userId: Types.ObjectId | string): Promise<string> {
    return this.registry.rollback(userId);
  }

  async getBySlug(slug: string): Promise<IThemeEngineThemeDocument | null> {
    return this.registry.getBySlug(slug);
  }

  /**
   * Remove an installed theme from the registry and delete its on-disk package
   * + compiled cache. Refuses the active theme and the built-in default theme.
   */
  async remove(slug: string): Promise<void> {
    if (slug === DEFAULT_THEME_SLUG) {
      throw new ThemeEngineError(
        'THEME_ACTIVE_LOCKED',
        `The built-in default theme "${DEFAULT_THEME_SLUG}" cannot be deleted.`
      );
    }

    const existing = await this.registry.getBySlug(slug);
    if (!existing) throw new ThemeNotFoundError(slug);

    await this.registry.remove(slug);

    await Promise.all([
      fs.rm(path.join(THEMES_ROOT, slug), { recursive: true, force: true }).catch(() => undefined),
      fs.rm(path.join(COMPILED_ROOT, slug), { recursive: true, force: true }).catch(() => undefined),
    ]);
  }

  async listInstalled(): Promise<IThemeEngineThemeDocument[]> {
    return this.registry.list();
  }

  async startPreview(slug: string, userId: Types.ObjectId | string): Promise<ThemePreviewTicket> {
    return this.preview.startPreview(slug, userId);
  }

  async exitPreview(token: string): Promise<void> {
    return this.preview.endPreview(token);
  }

  async getCustomization(slug: string): Promise<Record<string, unknown>> {
    return themeCustomizationRepository.get(slug);
  }

  async saveCustomization(
    slug: string,
    values: Record<string, unknown>,
    userId: Types.ObjectId | string
  ): Promise<void> {
    await themeCustomizationRepository.save(slug, values, userId);
  }

  async getCustomizerSchema(slug: string) {
    const theme = await this.registry.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);
    return {
      schema: flattenSettingsSchema(theme.manifest),
      defaults: defaultsFromSettingsSchema(theme.manifest),
    };
  }

  async getTemplates(slug: string) {
    return this.registry.getTemplates(slug);
  }

  async getBlocks(slug: string) {
    return this.registry.getBlocks(slug);
  }

  async getPartials(slug: string) {
    return this.registry.getPartials(slug);
  }

  async renderPage(input: RenderInput): Promise<RenderResult> {
    await this.ensureDefaultThemeInstalled();

    try {
      return await this.renderer.render(input);
    } catch (primaryError) {
      console.error(
        `[themeEngine] ThemeManager: render failed for theme "${input.previewThemeSlug ?? '(active)'}" on page "${input.page.slug}" — falling back to the default theme. Cause: ${describeError(primaryError)}`
      );

      try {
        await this.ensureDefaultThemeInstalled();
        const fallback = await this.renderer.render({ ...input, previewThemeSlug: DEFAULT_THEME_SLUG });
        return { ...fallback, usedFallback: true };
      } catch (fallbackError) {
        // Do not recurse further — this is the hard-500 case (spec §4.13 step 3).
        console.error(`[themeEngine] ThemeManager: the DEFAULT theme also failed to render — hard failure, no further retry. Cause: ${describeError(fallbackError)}`);
        throw fallbackError;
      }
    }
  }

  /** Ensures the built-in default theme exists on disk (safe to call from instrumentation). */
  async ensureDefaultThemeReady(): Promise<void> {
    await this.ensureDefaultThemeInstalled();
  }

  /** Idempotent — installs the shipped-in-repo default theme on first need, via the real install pipeline (spec §4.3), not a shortcut. Replaces when the shipped source version is newer. */
  private async ensureDefaultThemeInstalled(): Promise<void> {
    const existing = await this.registry.getBySlug(DEFAULT_THEME_SLUG);
    const onDisk = await this.defaultThemeFilesPresent();
    const sourceVersion = await this.readDefaultThemeSourceVersion();

    if (
      existing?.status === 'installed' &&
      onDisk &&
      (!sourceVersion || existing.version === sourceVersion)
    ) {
      return;
    }

    const zip = await buildZipFromDirectory(DEFAULT_THEME_SOURCE_DIR);
    await this.installer.install(zip, { installedBy: SYSTEM_USER_ID, replace: true });
  }

  private async readDefaultThemeSourceVersion(): Promise<string | null> {
    try {
      const raw = await fs.readFile(path.join(DEFAULT_THEME_SOURCE_DIR, MANIFEST_FILENAME), 'utf8');
      const json = JSON.parse(raw) as { version?: string };
      return typeof json.version === 'string' ? json.version : null;
    } catch {
      return null;
    }
  }

  private async defaultThemeFilesPresent(): Promise<boolean> {
    try {
      await fs.access(path.join(THEMES_ROOT, DEFAULT_THEME_SLUG, MANIFEST_FILENAME));
      return true;
    } catch {
      return false;
    }
  }
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Recursively zips a directory on disk into an in-memory buffer (used only for the shipped-in-repo default theme). */
async function buildZipFromDirectory(rootDir: string): Promise<Buffer> {
  const zip = new JSZip();

  async function walk(dir: string, prefix: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, rel);
      } else if (entry.isFile()) {
        zip.file(rel, await fs.readFile(abs));
      }
    }
  }

  await walk(rootDir, '');
  return zip.generateAsync({ type: 'nodebuffer' });
}

/** Convenience singleton. */
export const themeManager = new ThemeManager();
