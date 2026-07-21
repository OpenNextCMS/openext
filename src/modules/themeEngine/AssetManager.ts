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

  private static key(slug: string, version: string): string {
    return `${slug}@${version}`;
  }

  /** Seed (or refresh) the known asset hashes for one (slug, version). No I/O — the caller already has this data (e.g. from a `ThemeDocument`). */
  registerAssetHashes(slug: string, version: string, hashes: ThemeDocument['assetHashes'] | undefined): void {
    this.hashes.set(AssetManager.key(slug, version), hashes ?? {});
  }

  /** True once a (slug, version) pair has had its hashes registered. */
  isRegistered(slug: string, version: string): boolean {
    return this.hashes.has(AssetManager.key(slug, version));
  }

  getStylesheetUrl(slug: string, version: string): string {
    return this.buildUrl(slug, 'assets/style.css', this.lookup(slug, version)?.stylesheet);
  }

  getScriptUrl(slug: string, version: string): string {
    return this.buildUrl(slug, 'assets/theme.js', this.lookup(slug, version)?.script);
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
        `AssetManager: no asset hashes registered for "${key}" — call registerAssetHashes() (done automatically by ThemeLoader.loadTheme()) before requesting asset URLs.`
      );
    }
    return found;
  }

  private buildUrl(slug: string, relativePath: string, hash?: string): string {
    const base = `/theme-engine-assets/${slug}/${relativePath}`;
    return hash ? `${base}?v=${hash}` : base;
  }
}

/** Convenience singleton. */
export const assetManager = new AssetManager();
