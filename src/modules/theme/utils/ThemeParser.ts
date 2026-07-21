import { ApiError } from '@/lib/api/errors';
import type { LoadedThemeZip } from './ZipExtractor';
import type { ParsedThemePackage } from '../types';
import { validateThemeJson } from '../validators/ThemeJsonValidator';
import {
  assertHasDesignTokens,
  assertPackageStructure,
  validateCmsCompatibility,
} from '../validators/PackageValidator';
import {
  isTokenGroupName,
  mergeAndValidateTokens,
  validateComponentVariants,
  validateTokenGroup,
  type TokenGroupName,
} from '../validators/TokenValidator';
import type { PartialThemeConfig } from '@/types/theme';
import { MAX_THEME_IMAGE_BYTES } from '../constants';
import { isSafeRelativePath } from './pathSafety';

/**
 * Parse a loaded theme ZIP into a structured ParsedThemePackage.
 * Supports:
 *   1) Full package format (tokens/, templates/, layouts/, blocks/, presets/, assets/)
 *   2) Legacy token envelope (theme.json with inline theme / componentVariants)
 */

async function readJsonEntry(
  zip: LoadedThemeZip,
  relativePath: string
): Promise<unknown | null> {
  const entry = zip.entries.find((e) => e.relativePath === relativePath);
  if (!entry) return null;
  try {
    return JSON.parse((await entry.getBuffer()).toString('utf8'));
  } catch {
    throw new ApiError(`"${relativePath}" is not valid JSON.`, 400);
  }
}

async function findJsonBySuffix(
  zip: LoadedThemeZip,
  pattern: RegExp
): Promise<unknown | null> {
  const entry = zip.entries.find((e) => pattern.test(e.relativePath));
  if (!entry) return null;
  try {
    return JSON.parse((await entry.getBuffer()).toString('utf8'));
  } catch {
    throw new ApiError(`"${entry.relativePath}" is not valid JSON.`, 400);
  }
}

/**
 * Normalize layouts/*.json so Apply layout always receives a `sections` array.
 * Accepts: { sections: [...] }, bare [...], or { layout: { sections } }.
 */
function normalizeLayoutJson(raw: unknown, sourcePath: string): Record<string, unknown> {
  if (Array.isArray(raw)) {
    return {
      id: sourcePath,
      name: sourcePath,
      sections: raw.map((s) => String(s).toLowerCase()).filter(Boolean),
    };
  }
  if (!raw || typeof raw !== 'object') {
    throw new ApiError(
      `"${sourcePath}" must be a JSON object with a "sections" array (page layout).`,
      400
    );
  }

  const obj = raw as Record<string, unknown>;
  let sections = obj.sections;
  if (!Array.isArray(sections) && obj.layout && typeof obj.layout === 'object') {
    sections = (obj.layout as { sections?: unknown }).sections;
  }
  if (!Array.isArray(sections)) {
    throw new ApiError(
      `"${sourcePath}" must include a "sections" array (e.g. ["hero","features","cta"]). ` +
        `Note: tokens/layout.json is for design tokens (width/spacing), not page layouts — put page layouts in layouts/*.json.`,
      400
    );
  }

  return {
    ...obj,
    sections: sections.map((s) => String(s).toLowerCase()).filter(Boolean),
  };
}

function pickImage(
  zip: LoadedThemeZip,
  preferredRelative: string | undefined,
  fallbackNames: string[]
): { entryPath: string } | null {
  if (preferredRelative && isSafeRelativePath(preferredRelative)) {
    const found = zip.entries.find((e) => e.relativePath === preferredRelative);
    if (found) return { entryPath: found.relativePath };
  }
  for (const name of fallbackNames) {
    const found = zip.entries.find(
      (e) => e.relativePath.toLowerCase() === name.toLowerCase()
    );
    if (found) return { entryPath: found.relativePath };
  }
  return null;
}

async function loadImageBuffer(
  zip: LoadedThemeZip,
  relativePath: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  const entry = zip.entries.find((e) => e.relativePath === relativePath);
  if (!entry) return null;
  if (entry.size > MAX_THEME_IMAGE_BYTES) return null;
  const buffer = await entry.getBuffer();
  if (buffer.length > MAX_THEME_IMAGE_BYTES) return null;
  const ext = relativePath.split('.').pop()?.toLowerCase() || 'png';
  return { buffer, ext };
}

export async function parseThemePackage(
  zip: LoadedThemeZip,
  opts?: { fallbackName?: string }
): Promise<ParsedThemePackage> {
  assertPackageStructure(zip.entries.map((e) => e.relativePath));

  const themeJsonRaw = await readJsonEntry(zip, 'theme.json');
  if (!themeJsonRaw) {
    throw new ApiError('theme.json was not found in the theme package.', 400);
  }

  const meta = validateThemeJson(themeJsonRaw, opts?.fallbackName);
  validateCmsCompatibility(meta);

  const themeObj = themeJsonRaw as Record<string, unknown>;

  // ---- tokens/ ----
  // Match at package root or one nested folder (after ZipExtractor root strip).
  const tokenPath = /(?:^|\/)tokens\/([a-z0-9-]+)\.json$/i;
  const layoutPath = /(?:^|\/)layouts\/([a-z0-9_-]+)\.json$/i;
  const blockPath = /(?:^|\/)blocks\/([a-z0-9_-]+)\.json$/i;
  const presetPath = /(?:^|\/)presets\/([a-z0-9_-]+)\.json$/i;

  const partialTokens: PartialThemeConfig = {};
  const rawTokens: Record<string, unknown> = {};
  let hasTokenFiles = false;

  for (const entry of zip.entries) {
    const m = tokenPath.exec(entry.relativePath);
    if (!m) continue;
    const group = m[1].toLowerCase();
    if (!isTokenGroupName(group)) continue;
    let json: unknown;
    try {
      json = JSON.parse((await entry.getBuffer()).toString('utf8'));
    } catch {
      throw new ApiError(`"${entry.relativePath}" is not valid JSON.`, 400);
    }
    const validated = validateTokenGroup(group as TokenGroupName, json);
    (partialTokens as Record<string, unknown>)[group] = validated;
    rawTokens[group] = validated;
    hasTokenFiles = true;
  }

  // Inline theme from theme.json (legacy or hybrid)
  let inlineTheme: PartialThemeConfig | undefined;
  if (themeObj.theme && typeof themeObj.theme === 'object' && !Array.isArray(themeObj.theme)) {
    inlineTheme = themeObj.theme as PartialThemeConfig;
  } else {
    const groups = ['colors', 'typography', 'spacing', 'radius', 'shadows', 'layout'] as const;
    if (groups.some((g) => g in themeObj)) {
      inlineTheme = themeObj as PartialThemeConfig;
    }
  }

  // ---- template (WordPress-style HTML) theme detection ----
  // A theme is a "template" theme when theme.json declares `renderer:"template"`
  // OR the package ships HTML template files. Such themes render their own HTML
  // verbatim and are NOT required to carry design tokens.
  const htmlEntries = zip.entries.filter((e) => /\.html?$/i.test(e.relativePath));
  const declaredRenderer =
    typeof themeObj.renderer === 'string' ? themeObj.renderer.toLowerCase() : undefined;
  const renderer: 'blocks' | 'template' =
    declaredRenderer === 'template' || (declaredRenderer !== 'blocks' && htmlEntries.length > 0)
      ? 'template'
      : 'blocks';

  if (renderer !== 'template') {
    assertHasDesignTokens({
      hasTokenFiles,
      hasInlineTheme: !!inlineTheme,
    });
  }

  // Template themes with no tokens still get a valid (default) ThemeConfig so the
  // Theme Builder / block fallbacks keep working; their real styling is their CSS.
  const theme = mergeAndValidateTokens(partialTokens, inlineTheme);

  // If no token files, still store merged groups under tokens for export
  if (!hasTokenFiles) {
    rawTokens.colors = theme.colors;
    rawTokens.typography = theme.typography;
    rawTokens.spacing = theme.spacing;
    rawTokens.radius = theme.radius;
    rawTokens.shadows = theme.shadows;
    // layout stays as Theme Builder layout group
    rawTokens.layout = theme.layout;
  }

  const componentVariants = validateComponentVariants(themeObj.componentVariants);

  // ---- templates ----
  const templates: ParsedThemePackage['templates'] = {};
  const headerJson =
    (await readJsonEntry(zip, 'templates/header.json')) ??
    (await findJsonBySuffix(zip, /(?:^|\/)templates\/header\.json$/i));
  const footerJson =
    (await readJsonEntry(zip, 'templates/footer.json')) ??
    (await findJsonBySuffix(zip, /(?:^|\/)templates\/footer\.json$/i));
  if (headerJson !== null) templates.header = headerJson;
  if (footerJson !== null) templates.footer = footerJson;

  // ---- layouts (page section order — not tokens/layout.json) ----
  const layouts: Record<string, unknown> = {};
  for (const entry of zip.entries) {
    const m = layoutPath.exec(entry.relativePath);
    if (!m) continue;
    let json: unknown;
    try {
      json = JSON.parse((await entry.getBuffer()).toString('utf8'));
    } catch {
      throw new ApiError(`"${entry.relativePath}" is not valid JSON.`, 400);
    }
    layouts[m[1].toLowerCase()] = normalizeLayoutJson(json, entry.relativePath);
  }

  // ---- blocks + presets ----
  const blocks: Record<string, unknown> = {};
  for (const entry of zip.entries) {
    const m = blockPath.exec(entry.relativePath);
    if (!m) continue;
    try {
      blocks[m[1].toLowerCase()] = JSON.parse((await entry.getBuffer()).toString('utf8'));
    } catch {
      throw new ApiError(`"${entry.relativePath}" is not valid JSON.`, 400);
    }
  }

  const styles: Record<string, unknown> = {};
  for (const entry of zip.entries) {
    const m = presetPath.exec(entry.relativePath);
    if (!m) continue;
    try {
      styles[m[1].toLowerCase()] = JSON.parse((await entry.getBuffer()).toString('utf8'));
    } catch {
      throw new ApiError(`"${entry.relativePath}" is not valid JSON.`, 400);
    }
  }

  // ---- assets to extract (everything under assets/, css/, fonts/, images/) ----
  const assetEntries = zip.entries.filter((e) => {
    const p = e.relativePath.toLowerCase();
    return (
      p.startsWith('assets/') ||
      p.startsWith('css/') ||
      p.startsWith('fonts/') ||
      p.startsWith('images/')
    );
  });

  // ---- preview / thumbnail ----
  const previewPick = pickImage(zip, meta.preview, [
    'preview.png',
    'preview.jpg',
    'preview.jpeg',
    'preview.webp',
    'preview.gif',
    'preview.svg',
  ]);
  const thumbPick = pickImage(zip, meta.thumbnail, [
    'thumbnail.jpg',
    'thumbnail.jpeg',
    'thumbnail.png',
    'thumbnail.webp',
    'thumbnail.svg',
  ]);

  let previewBuffer: Buffer | undefined;
  let previewExt: string | undefined;
  let thumbnailBuffer: Buffer | undefined;
  let thumbnailExt: string | undefined;

  if (previewPick) {
    const img = await loadImageBuffer(zip, previewPick.entryPath);
    if (img) {
      previewBuffer = img.buffer;
      previewExt = img.ext;
    }
  }
  if (thumbPick) {
    const img = await loadImageBuffer(zip, thumbPick.entryPath);
    if (img) {
      thumbnailBuffer = img.buffer;
      thumbnailExt = img.ext;
    }
  }

  return {
    meta: { ...meta, renderer },
    theme,
    componentVariants,
    tokens: rawTokens,
    templates,
    layouts,
    presets: { blocks, styles },
    supports: meta.supports ?? [],
    renderer,
    htmlEntries,
    htmlTemplates: htmlEntries.map((e) => e.relativePath),
    assetEntries,
    previewBuffer,
    previewExt,
    thumbnailBuffer,
    thumbnailExt,
  };
}
