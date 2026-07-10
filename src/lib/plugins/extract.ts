import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import {
  hasBlockedExtension,
  isSafeRelativePath,
  parsePluginManifest,
  type ParsedPluginManifest,
} from '@/lib/plugins/manifest';
import {
  ensurePluginsDirectory,
  getPluginDirectory,
  MAX_PLUGIN_FILES,
  toPublicPluginPath,
} from '@/lib/plugins/storage';

interface ExtractedPlugin {
  manifest: ParsedPluginManifest;
  entryPoint: string;
  styles: string[];
}

function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function detectZipRootPrefix(filePaths: string[]): string {
  const normalized = filePaths.map(normalizeZipPath).filter(Boolean);
  if (normalized.length === 0) return '';

  const topLevels = new Set(normalized.map((filePath) => filePath.split('/')[0]));
  if (topLevels.size !== 1) return '';

  const prefix = `${[...topLevels][0]}/`;
  const hasNestedFiles = normalized.some((filePath) => filePath.includes('/'));
  if (!hasNestedFiles) return '';

  const manifestAtRoot = normalized.some(
    (filePath) => filePath === `${prefix}manifest.json` || filePath.endsWith('/manifest.json')
  );
  return manifestAtRoot ? prefix : '';
}

function findManifestRelativePath(filePaths: string[], rootPrefix: string): string {
  const candidates = filePaths
    .map(normalizeZipPath)
    .filter((filePath) => !filePath.endsWith('/'))
    .filter((filePath) => filePath.startsWith(rootPrefix))
    .map((filePath) => filePath.slice(rootPrefix.length))
    .filter((filePath) => filePath === 'manifest.json' || filePath.endsWith('/manifest.json'));

  const exact = candidates.find((filePath) => filePath === 'manifest.json');
  if (exact) return exact;

  const shallow = candidates.find((filePath) => !filePath.slice(0, -'manifest.json'.length).includes('/'));
  if (shallow) return shallow;

  if (candidates.length > 0) return candidates[0];
  throw new Error('manifest.json was not found in the plugin package');
}

async function readManifest(zip: JSZip, manifestPath: string): Promise<ParsedPluginManifest> {
  const manifestFile = zip.file(manifestPath);
  if (!manifestFile) {
    throw new Error('manifest.json was not found in the plugin package');
  }

  const manifestText = await manifestFile.async('text');
  let parsed: unknown;

  try {
    parsed = JSON.parse(manifestText);
  } catch {
    throw new Error('manifest.json contains invalid JSON');
  }

  return parsePluginManifest(parsed);
}

export async function extractPluginZip(
  arrayBuffer: ArrayBuffer,
  pluginIdOverride?: string
): Promise<ExtractedPlugin> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fileEntries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);

  if (fileEntries.length === 0) {
    throw new Error('The plugin package is empty');
  }

  if (fileEntries.length > MAX_PLUGIN_FILES) {
    throw new Error(`Plugin package exceeds the ${MAX_PLUGIN_FILES} file limit`);
  }

  const filePaths = fileEntries.map(([filePath]) => filePath);
  const rootPrefix = detectZipRootPrefix(filePaths);
  const manifestRelativePath = findManifestRelativePath(filePaths, rootPrefix);
  const manifest = await readManifest(zip, `${rootPrefix}${manifestRelativePath}`);
  const pluginId = pluginIdOverride || manifest.pluginId;
  const manifestDir = path.posix.dirname(manifestRelativePath);
  const pluginRootInZip =
    manifestDir === '.'
      ? rootPrefix.replace(/\/$/, '')
      : `${rootPrefix}${manifestDir}`.replace(/\/$/, '');
  const pluginDir = getPluginDirectory(pluginId);

  await ensurePluginsDirectory();
  await fs.rm(pluginDir, { recursive: true, force: true });
  await fs.mkdir(pluginDir, { recursive: true });

  const manifestDirPrefix = pluginRootInZip ? `${pluginRootInZip}/` : '';

  for (const [filePath, zipEntry] of fileEntries) {
    const normalized = normalizeZipPath(filePath);
    if (!normalized.startsWith(manifestDirPrefix) && manifestDirPrefix) continue;
    if (normalized === `${rootPrefix}${manifestRelativePath}`) continue;

    const relativePath = manifestDirPrefix
      ? normalized.slice(manifestDirPrefix.length)
      : normalized.slice(rootPrefix.length);

    if (!relativePath || !isSafeRelativePath(relativePath) || hasBlockedExtension(relativePath)) {
      continue;
    }

    const outputPath = path.join(pluginDir, relativePath);
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    const content = await zipEntry.async('nodebuffer');
    await fs.writeFile(outputPath, content);
  }

  const entryRelativePath = manifest.entryPoint;
  const entryAbsolutePath = path.join(pluginDir, entryRelativePath);

  try {
    await fs.access(entryAbsolutePath);
  } catch {
    throw new Error(`manifest.json entryPoint "${manifest.entryPoint}" was not found in the package`);
  }

  for (const stylePath of manifest.styles) {
    try {
      await fs.access(path.join(pluginDir, stylePath));
    } catch {
      throw new Error(`manifest.json styles entry "${stylePath}" was not found in the package`);
    }
  }

  return {
    manifest: { ...manifest, pluginId },
    entryPoint: toPublicPluginPath(pluginId, entryRelativePath),
    styles: manifest.styles.map((stylePath) => toPublicPluginPath(pluginId, stylePath)),
  };
}
