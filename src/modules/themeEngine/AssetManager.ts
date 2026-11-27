import type { ThemeDocument } from './types';

/**
 * §4.9 AssetManager — resolve theme CSS/JS/font/image URLs with cache-busting.
 *
 * Hard rule from the spec: the hash is computed ONCE, at install time
 * (`ThemeInstaller` writes it to `ThemeDocument.assetHashes` — spec §4.9 /
 * §1.1), and these getters are PURE SYNCHRONOUS LOOKUPS against that already-
 * computed value — never re-hash, never touch disk or the DB per call.
 *
 * That means this class cannot itself resolve `(slug, version) -> hashes` from
 * nothing: whoever loads a theme (`ThemeLoader.loadTheme()`) hands the hashes
 * over via `registerAssetHashes()` once per load, and the getters below only
 * ever read that in-memory map afterwards.
 *
 * Assets are served from OUTSIDE Next's `public/` dir via a
 * `/theme-engine-assets/{slug}/...` route (`src/app/theme-engine-assets/`).
 * Named distinctly from the pre-existing `/theme-assets/{theme}/...` route
 * (the old Theme Package Manager's asset controller, `src/modules/theme`) —
 * Next.js does not allow two dynamic segments with different param names at
 * the same path level, and that old route is deleted, not renamed, once the
 * new engine is fully wired.
 */
export class AssetManager {
  private readonly hashes = new Map<string, ThemeDocument['assetHashes']>();
  private readonly paths = new Map<string, NonNullable<ThemeDocument['assetPaths']>>();

  private static key(slug: string, version: string): string {
    return `${slug}@${version}`;
  }

  registerThemeAssets(
    slug: string,
    version: string,
    data: {
      hashes?: ThemeDocument['assetHashes'];
      paths?: ThemeDocument['assetPaths'];
    }
  ): void {
    this.registerAssetHashes(slug, version, data.hashes);
    this.paths.set(AssetManager.key(slug, version), data.paths ?? {});
  }

  /** @deprecated Prefer registerThemeAssets — kept for compatibility. */
  registerAssetHashes(slug: string, version: string, hashes: ThemeDocument['assetHashes'] | undefined): void {
    this.hashes.set(AssetManager.key(slug, version), hashes ?? {});
  }

  isRegistered(slug: string, version: string): boolean {
    return this.hashes.has(AssetManager.key(slug, version));
  }

  getStylesheetUrl(slug: string, version: string): string {
    const rel = this.lookupPaths(slug, version)?.stylesheet ?? 'assets/style.css';
    return this.buildUrl(slug, rel, this.lookup(slug, version)?.stylesheet);
  }

  getScriptUrl(slug: string, version: string): string {
    const rel = this.lookupPaths(slug, version)?.script ?? 'assets/theme.js';
    return this.buildUrl(slug, rel, this.lookup(slug, version)?.script);
  }

  /** Fonts/images under `/public` in the package — no per-file hash is tracked in v1 (only `style.css`/`theme.js`, per `ThemeDocument.assetHashes`'s shape), so no cache-busting query is appended here. */
  getPublicAssetUrl(slug: string, relativePath: string): string {
    return this.buildUrl(slug, relativePath);
  }

  private lookup(slug: string, version: string): ThemeDocument['assetHashes'] {
    const key = AssetManager.key(slug, version);
    const found = this.hashes.get(key);
    if (found === undefined) {
      throw new Error(
        `AssetManager: no asset hashes registered for "${key}" — call registerThemeAssets() before requesting asset URLs.`
      );
    }
    return found;
  }

  private lookupPaths(slug: string, version: string): ThemeDocument['assetPaths'] {
    return this.paths.get(AssetManager.key(slug, version)) ?? {};
  }

  private buildUrl(slug: string, relativePath: string, hash?: string): string {
    const base = `/theme-engine-assets/${slug}/${relativePath}`;
    return hash ? `${base}?v=${hash}` : base;
  }
}

/** Convenience singleton. */
export const assetManager = new AssetManager();
