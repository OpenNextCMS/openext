import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import ts from 'typescript';
import { COMPILED_ROOT, MANIFEST_FILENAME, THEMES_ROOT } from '../config';
import { manifestParser } from '../ManifestParser';
import type { ThemeManifest, ThemeValidationIssue } from '../types';
import { autoDiscover } from './autoDiscover';
import { manifestFromRegistry, mergeRegistries } from './manifestFromRegistry';
import { validateRegistration, RegistrationValidationCode } from './validateRegistration';
import type { ThemeDefinition, ThemeRuntimeRegistry } from './types';

export interface ThemeBootstrapResult {
  manifest: ThemeManifest;
  registry: ThemeRuntimeRegistry;
  errors: ThemeValidationIssue[];
  warnings: ThemeValidationIssue[];
}

export interface ThemeBootstrapOptions {
  /** When true, compile and execute theme.ts (runtime load). When false, auto-discover only (upload validation). */
  executeEntry?: boolean;
  slug?: string;
  version?: string;
}

const DEFAULT_ENTRY = 'theme.ts';
const SDK_COMPILE_SLUG = '_cms-sdk';
const SDK_COMPILE_VERSION = '1.0.0';

/** Theme Engine sources compiled into the internal @cms/theme runtime bundle. */
const SDK_SOURCE_FILES = [
  'types.ts',
  'registration/createEmptyRegistry.ts',
  'registration/types.ts',
  'registration/ThemeRegistrationContext.ts',
  'registration/defineTheme.ts',
  'sdk/index.ts',
] as const;

/**
 * Full theme bootstrap pipeline:
 * 1. Parse theme.json
 * 2. Auto-discover conventional folders
 * 3. Load + execute theme.ts (when executeEntry is true)
 * 4. Merge registries (theme.ts overrides auto-discovery)
 * 5. Build enriched manifest for ThemeLoader
 */
export class ThemeBootstrap {
  async bootstrap(root: string, options: ThemeBootstrapOptions = {}): Promise<ThemeBootstrapResult> {
    const errors: ThemeValidationIssue[] = [];
    const warnings: ThemeValidationIssue[] = [];

    const baseManifest = await this.readManifest(root, errors);
    if (!baseManifest) {
      return { manifest: this.fallbackManifest(), registry: (await autoDiscover(root)), errors, warnings };
    }

    let registry = await autoDiscover(root);

    const entryRel = baseManifest.entry ?? DEFAULT_ENTRY;
    const entryAbs = path.join(root, entryRel);

    if (options.executeEntry && (await this.fileExists(entryAbs))) {
      const loaded = await this.loadThemeDefinition(root, entryRel, options.slug ?? baseManifest.slug, options.version ?? baseManifest.version);
      if (loaded.errors.length > 0) {
        errors.push(...loaded.errors);
      } else if (loaded.definition) {
        registry = mergeRegistries(registry, loaded.definition.registry);
      }
    }

    const manifest = manifestFromRegistry(baseManifest, registry);

    const regValidation = await validateRegistration(root, registry, {
      requireIndexTemplate: true,
      entryPath: baseManifest.entry ?? (await this.fileExists(entryAbs) ? entryRel : undefined),
    });
    errors.push(...regValidation.errors);
    warnings.push(...regValidation.warnings);

    if (!manifest.templates.index) {
      errors.push({
        code: RegistrationValidationCode.INDEX_TEMPLATE_MISSING,
        message: 'Bootstrap completed but no index template is available.',
        file: MANIFEST_FILENAME,
      });
    }

    return { manifest, registry, errors, warnings };
  }

  /** Validate-only bootstrap for ThemeValidator — executes theme.ts when entry is declared. */
  async validateOnly(root: string, baseManifest: ThemeManifest): Promise<ThemeBootstrapResult> {
    const errors: ThemeValidationIssue[] = [];
    const warnings: ThemeValidationIssue[] = [];

    let registry = await autoDiscover(root);

    const entryRel = baseManifest.entry ?? DEFAULT_ENTRY;
    const entryAbs = path.join(root, entryRel);

    if (baseManifest.entry && (await this.fileExists(entryAbs))) {
      const loaded = await this.loadThemeDefinition(
        root,
        entryRel,
        baseManifest.slug,
        baseManifest.version
      );
      errors.push(...loaded.errors);
      if (loaded.definition) {
        registry = mergeRegistries(registry, loaded.definition.registry);
      }
    }

    const manifest = manifestFromRegistry(baseManifest, registry);
    const regValidation = await validateRegistration(root, registry, {
      requireIndexTemplate: !baseManifest.entry,
      entryPath: baseManifest.entry,
    });
    errors.push(...regValidation.errors);
    warnings.push(...regValidation.warnings);

    return { manifest, registry, errors, warnings };
  }

  private async readManifest(root: string, errors: ThemeValidationIssue[]): Promise<ThemeManifest | null> {
    try {
      const raw = await fs.readFile(path.join(root, MANIFEST_FILENAME), 'utf8');
      const { manifest } = manifestParser.parse(JSON.parse(raw) as unknown);
      return manifest;
    } catch (err) {
      errors.push({
        code: RegistrationValidationCode.THEME_TS_LOAD_FAILED,
        message: err instanceof Error ? err.message : 'Failed to read theme.json',
        file: MANIFEST_FILENAME,
      });
      return null;
    }
  }

  private async loadThemeDefinition(
    root: string,
    entryRel: string,
    slug: string,
    version: string
  ): Promise<{ definition?: ThemeDefinition; errors: ThemeValidationIssue[] }> {
    const errors: ThemeValidationIssue[] = [];
    try {
      const sourcePath = path.join(root, entryRel);
      let source = await fs.readFile(sourcePath, 'utf8');
      source = await this.rewriteThemeEntrySource(source);

      const compiledPath = await this.compile(slug, version, entryRel, sourcePath, source);
      const mod = (await import(/* webpackIgnore: true */ pathToFileURL(compiledPath).href)) as Record<
        string,
        unknown
      >;
      const candidate = unwrapDefault(mod);

      if (!candidate || typeof candidate !== 'object' || !('registry' in (candidate as object))) {
        errors.push({
          code: RegistrationValidationCode.THEME_TS_LOAD_FAILED,
          message: 'theme.ts must default-export defineTheme(...) result.',
          file: entryRel,
        });
        return { errors };
      }

      return { definition: candidate as ThemeDefinition, errors };
    } catch (err) {
      errors.push({
        code: RegistrationValidationCode.THEME_TS_LOAD_FAILED,
        message: err instanceof Error ? err.message : String(err),
        file: entryRel,
      });
      return { errors };
    }
  }

  private async compile(
    slug: string,
    version: string,
    relPath: string,
    sourcePath: string,
    sourceOverride?: string
  ): Promise<string> {
    const outPath = path.join(COMPILED_ROOT, slug, version, `${relPath}.cjs`);
    const source = sourceOverride ?? (await fs.readFile(sourcePath, 'utf8'));

    const result = ts.transpileModule(source, {
      fileName: sourcePath,
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
      throw new Error(ts.flattenDiagnosticMessageText(first.messageText, ' '));
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, result.outputText, 'utf8');
    return outPath;
  }

  private async fileExists(abs: string): Promise<boolean> {
    try {
      return (await fs.stat(abs)).isFile();
    } catch {
      return false;
    }
  }

  private fallbackManifest(): ThemeManifest {
    return {
      name: 'Unknown',
      slug: 'unknown',
      author: '',
      version: '0.0.0',
      compatibleCmsVersion: '^2.0.0',
      templates: { index: 'templates/Index.tsx' },
      partials: {},
      menus: [],
      widgetAreas: [],
      themeSettings: [],
      supportedFeatures: [],
    };
  }

  /** Compile @cms/theme SDK to CommonJS once; returns absolute path to sdk/index.ts.cjs. */
  private async ensureSdkCompiled(): Promise<string> {
    const engineRoot = path.join(process.cwd(), 'src', 'modules', 'themeEngine');
    const sdkEntry = path.join(COMPILED_ROOT, SDK_COMPILE_SLUG, SDK_COMPILE_VERSION, 'sdk', 'index.ts.cjs');

    let newestSource = 0;
    for (const rel of SDK_SOURCE_FILES) {
      const st = await fs.stat(path.join(engineRoot, rel));
      newestSource = Math.max(newestSource, st.mtimeMs);
    }

    try {
      const st = await fs.stat(sdkEntry);
      if (st.mtimeMs >= newestSource) return sdkEntry;
    } catch {
      // compile fresh
    }

    for (const rel of SDK_SOURCE_FILES) {
      const sourcePath = path.join(engineRoot, rel);
      const outPath = path.join(COMPILED_ROOT, SDK_COMPILE_SLUG, SDK_COMPILE_VERSION, `${rel}.cjs`);
      await this.compile(SDK_COMPILE_SLUG, SDK_COMPILE_VERSION, rel, sourcePath);
      await patchCompiledRequires(outPath);
    }

    return sdkEntry;
  }

  /** Replace `@cms/theme` import with a require of the compiled internal SDK bundle. */
  private async rewriteThemeEntrySource(source: string): Promise<string> {
    const sdkAbsPath = (await this.ensureSdkCompiled()).replace(/\\/g, '/');
    const stripped = source.replace(
      /import\s+\{[^}]+\}\s+from\s+['"]@cms\/theme['"];?\s*\n?/g,
      ''
    );
    return `const { defineTheme, definePlugin } = require(${JSON.stringify(sdkAbsPath)});\n${stripped}`;
  }
}

/** Patch relative requires in compiled SDK output to absolute .cjs paths. */
async function patchCompiledRequires(outPath: string): Promise<void> {
  let code = await fs.readFile(outPath, 'utf8');
  code = code.replace(/require\(["']((?:\.\.?\/)[^"']+)["']\)/g, (_match, rel: string) => {
    const target = rel.endsWith('.ts') ? `${rel}.cjs` : `${rel}.ts.cjs`;
    const abs = path.resolve(path.dirname(outPath), target).replace(/\\/g, '/');
    return `require(${JSON.stringify(abs)})`;
  });
  await fs.writeFile(outPath, code, 'utf8');
}

function unwrapDefault(mod: Record<string, unknown>): unknown {
  let candidate: unknown = mod;
  for (let i = 0; i < 2; i++) {
    if (!candidate || typeof candidate !== 'object' || !('default' in candidate)) break;
    const next = (candidate as { default?: unknown }).default;
    if (next && typeof next === 'object' && 'registry' in next) return next;
    candidate = next;
  }
  return candidate;
}

/** Bootstrap a theme by slug from THEMES_ROOT. */
export async function bootstrapInstalledTheme(
  slug: string,
  version: string,
  executeEntry = true
): Promise<ThemeBootstrapResult> {
  const root = path.join(THEMES_ROOT, slug);
  const bootstrap = new ThemeBootstrap();
  return bootstrap.bootstrap(root, { executeEntry, slug, version });
}

export const themeBootstrap = new ThemeBootstrap();
