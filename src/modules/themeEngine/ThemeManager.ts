import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { Types } from 'mongoose';
import { themeInstaller, type ThemeInstaller } from './ThemeInstaller';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import { themeRenderer, type ThemeRenderer } from './ThemeRenderer';
import { themePreviewService, type ThemePreviewService } from './ThemePreviewService';
import { DEFAULT_THEME_SLUG, DEFAULT_THEME_SOURCE_DIR } from './config';
import type { IThemeEngineThemeDocument } from './models/Theme';
import type { RenderInput, RenderResult, ThemePreviewTicket } from './types';

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

  async listInstalled(): Promise<IThemeEngineThemeDocument[]> {
    return this.registry.list();
  }

  async startPreview(slug: string, userId: Types.ObjectId | string): Promise<ThemePreviewTicket> {
    return this.preview.startPreview(slug, userId);
  }

  async renderPage(input: RenderInput): Promise<RenderResult> {
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

  /** Idempotent — installs the shipped-in-repo default theme on first need, via the real install pipeline (spec §4.3), not a shortcut. */
  private async ensureDefaultThemeInstalled(): Promise<void> {
    const existing = await this.registry.getBySlug(DEFAULT_THEME_SLUG);
    if (existing?.status === 'installed') return;

    const zip = await buildZipFromDirectory(DEFAULT_THEME_SOURCE_DIR);
    await this.installer.install(zip, { installedBy: SYSTEM_USER_ID, replace: true });
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
