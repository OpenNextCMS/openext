import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import ts from 'typescript';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import { ThemeCache, themeCache } from './ThemeCache';
import { assetManager, type AssetManager } from './AssetManager';
import { ThemeLoadError } from './errors';
import { COMPILED_ROOT, THEMES_ROOT } from './config';
import type { LoadedTheme, LoadedThemeBlock, ThemeComponent } from './types';

/**
 * §4.6 ThemeLoader — given a theme slug, dynamically import its templates,
 * partials and block renderers, going through `ThemeCache` first.
 *
 * IMPLEMENTATION NOTE (not in the original module list, but required to make
 * §3's `.tsx` package format actually loadable): theme source lives outside
 * Next.js's own build graph and is installed at runtime, so it can't be
 * dynamically `import()`-ed as-is — Node has no JSX/TS support. Each declared
 * `.tsx`/`.ts` file is compiled to plain CommonJS ONCE (via the TypeScript
 * compiler API already used by `ThemeValidator` — no new dependency), cached
 * on disk under a (slug, version, path)-scoped directory so an upgrade can
 * never resolve a stale compiled artifact, then imported from there.
 *
 * A failed import of any ONE file (compile error, missing default export,
 * throwing module top-level code) is logged and the theme load continues —
 * the missing piece surfaces later as a gap in `LoadedTheme`, handled by
 * `TemplateResolver`/`ThemeRenderer`, never by throwing out of this class.
 */
export class ThemeLoader {
  constructor(
    private readonly registry: ThemeRegistry = themeRegistry,
    private readonly cache: ThemeCache = themeCache,
    private readonly assets: AssetManager = assetManager
  ) {}

  async loadTheme(slug: string): Promise<LoadedTheme> {
    const doc = await this.registry.getBySlug(slug);
    if (!doc || doc.status !== 'installed') {
      throw new ThemeLoadError(slug, `theme is not installed (status: ${doc?.status ?? 'not found'}).`);
    }

    const manifest = doc.manifest;
    const version = doc.version;
    const root = path.join(THEMES_ROOT, slug);

    // Seed AssetManager's sync lookup cache (spec §4.9) — the ONLY place the
    // already-computed hashes move from the DB doc into that pure-lookup cache.
    this.assets.registerAssetHashes(slug, version, doc.assetHashes);

    const templates: Record<string, ThemeComponent> = {};
    for (const [key, rel] of Object.entries(manifest.templates)) {
      if (!rel) continue;
      const comp = await this.loadComponent(slug, version, root, rel);
      if (comp) templates[key] = comp;
    }

    const partials: LoadedTheme['partials'] = {};
    const partialKeys = { header: 'Header', footer: 'Footer', sidebar: 'Sidebar' } as const;
    for (const [key, propName] of Object.entries(partialKeys) as [keyof typeof partialKeys, 'Header' | 'Footer' | 'Sidebar'][]) {
      const rel = manifest.partials[key];
      if (!rel) continue;
      const comp = await this.loadComponent(slug, version, root, rel);
      if (comp) partials[propName] = comp;
    }

    const blocks: Record<string, LoadedThemeBlock> = {};
    for (const b of manifest.blocks ?? []) {
      const renderer = await this.loadComponent(slug, version, root, b.rendererPath);
      if (!renderer) continue; // logged already; this block type is simply absent.
      let schema: unknown;
      if (b.schemaPath) schema = await this.loadExport(slug, version, root, b.schemaPath);
      blocks[b.type] = { Renderer: renderer, schema };
    }

    return { manifest, templates, partials, blocks };
  }

  /** Load a file and require its default export to be a component (function/class). */
  private async loadComponent(slug: string, version: string, root: string, relPath: string): Promise<ThemeComponent | undefined> {
    const mod = await this.loadModule(slug, version, root, relPath);
    if (mod === undefined) return undefined;
    const candidate = unwrapModuleDefault(mod);
    if (typeof candidate !== 'function') {
      this.warn(slug, relPath, `does not export a usable component (got ${typeof candidate}).`);
      return undefined;
    }
    return candidate as ThemeComponent;
  }

  /** Load a file and return its default export (or the whole module if none). */
  private async loadExport(slug: string, version: string, root: string, relPath: string): Promise<unknown> {
    const mod = await this.loadModule(slug, version, root, relPath);
    if (mod === undefined) return undefined;
    return unwrapModuleDefault(mod);
  }

  /** Compile (if needed) + dynamically import a theme-relative file, cache-first. */
  private async loadModule(slug: string, version: string, root: string, relPath: string): Promise<Record<string, unknown> | undefined> {
    const cacheKey = ThemeCache.componentKey(slug, version, relPath);
    const cached = this.cache.getComponentModule(cacheKey);
    if (cached !== undefined) return cached as Record<string, unknown>;

    try {
      const sourcePath = path.join(root, relPath);
      const compiledPath = await this.compile(slug, version, relPath, sourcePath);
      // webpackIgnore: this path is only known at RUNTIME (compiled from a
      // theme installed after the app was built) — without this comment,
      // Next's webpack tries to statically bundle the dynamic import
      // (warning: "Critical dependency: the request of a dependency is an
      // expression") and its own module resolution then fails to find a file
      // it never knew existed at build time. Same fix already used by the
      // old themeSystem module for the identical situation.
      const mod = (await import(/* webpackIgnore: true */ pathToFileURL(compiledPath).href)) as Record<string, unknown>;
      this.cache.setComponentModule(cacheKey, mod);
      return mod;
    } catch (err) {
      this.warn(slug, relPath, err instanceof Error ? err.message : String(err));
      return undefined;
    }
  }

  /** Compile a theme source file to CommonJS once; reuse the artifact on later loads. */
  private async compile(slug: string, version: string, relPath: string, sourcePath: string): Promise<string> {
    const outPath = path.join(COMPILED_ROOT, slug, version, `${relPath}.cjs`);

    const alreadyCompiled = await fs
      .stat(outPath)
      .then((st) => st.isFile())
      .catch(() => false);
    if (alreadyCompiled) return outPath;

    const source = await fs.readFile(sourcePath, 'utf8');
    const result = ts.transpileModule(source, {
      fileName: sourcePath, // extension drives JSX/TS parsing
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        allowJs: true,
      },
      reportDiagnostics: true,
    });

    const fatal = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (fatal.length > 0) {
      const first = fatal[0];
      const message = ts.flattenDiagnosticMessageText(first.messageText, ' ');
      throw new Error(`compile error: ${message}`);
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, result.outputText, 'utf8');
    return outPath;
  }

  private warn(slug: string, relPath: string, message: string): void {
    console.warn(`[themeEngine] ThemeLoader: failed to load "${relPath}" from theme "${slug}": ${message}`);
  }
}

/**
 * Node's native CJS<->ESM interop for a dynamically `import()`-ed `.cjs` file
 * DOUBLE-wraps a TS-compiled `export default X`: `namespace.default` is
 * `module.exports` as a whole (`{ __esModule: true, default: X, ... }`), not
 * `X` itself — `X` is actually at `namespace.default.default`. (Confirmed
 * empirically; this differs from how some dev tooling/loaders present the
 * same file, so don't assume a single unwrap is enough.) Unwraps `.default`
 * up to twice, stopping as soon as a function is found, so it's correct for
 * both single- and double-wrapped shapes.
 */
function unwrapModuleDefault(mod: Record<string, unknown>): unknown {
  let candidate: unknown = mod;
  for (let i = 0; i < 2; i++) {
    if (!candidate || typeof candidate !== 'object' || !('default' in candidate)) break;
    const next = (candidate as { default?: unknown }).default;
    if (typeof next === 'function') return next;
    candidate = next;
  }
  return candidate;
}

/** Convenience singleton. */
export const themeLoader = new ThemeLoader();
