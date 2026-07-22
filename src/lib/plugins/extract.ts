import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import {
  hasBlockedExtension,
  isSafeRelativePath,
  parsePluginManifest,
  resolvePluginKind,
  type ParsedPluginManifest,
  type PluginKind,
} from '@/lib/plugins/manifest';
import {
  ensurePluginsDirectory,
  getPluginDirectory,
  MAX_PLUGIN_FILES,
  toPublicPluginPath,
} from '@/lib/plugins/storage';
import {
  ensureBackendPluginsDirectory,
  getBackendPluginDirectory,
} from '@/lib/plugins/server/storage';
import {
  shouldExtractToBackend,
  shouldExtractToFrontend,
  validateBackendManifest,
} from '@/lib/plugins/server/validation';

export interface ExtractedPlugin {
  manifest: ParsedPluginManifest & { kind: PluginKind; type: string };
  kind: PluginKind;
  /** Public URL for canvas block entry (block plugins, or system with block/). */
  entryPoint?: string;
  /** Public URL for dashboard admin HTML. */
  adminEntry?: string;
  /** Public URL for optional system placeable block. */
  blockEntry?: string;
  styles: string[];
  hasBackend: boolean;
  serverEntry?: string;
  migrations: string[];
  models: string[];
  permissions: string[];
  installHook?: string;
  uninstallHook?: string;
  dependencies: string[];
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

  const shallow = candidates.find(
    (filePath) => !filePath.slice(0, -'manifest.json'.length).includes('/')
  );
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

async function assertFileExists(absolutePath: string, label: string): Promise<void> {
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`${label} was not found in the package`);
  }
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
  const publicPluginDir = getPluginDirectory(pluginId);
  const backendPluginDir = getBackendPluginDirectory(pluginId);

  await ensurePluginsDirectory();
  await ensureBackendPluginsDirectory();
  await fs.rm(publicPluginDir, { recursive: true, force: true });
  await fs.rm(backendPluginDir, { recursive: true, force: true });
  await fs.mkdir(publicPluginDir, { recursive: true });
  await fs.mkdir(backendPluginDir, { recursive: true });

  const manifestDirPrefix = pluginRootInZip ? `${pluginRootInZip}/` : '';
  const extractedRelativePaths: string[] = [];

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

    extractedRelativePaths.push(relativePath);
    const content = await zipEntry.async('nodebuffer');

    if (shouldExtractToBackend(relativePath)) {
      const outputPath = path.join(backendPluginDir, relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
    }

    if (shouldExtractToFrontend(relativePath)) {
      const outputPath = path.join(publicPluginDir, relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
    }
  }

  const backendMeta = validateBackendManifest(manifest, extractedRelativePaths);

  const manifestPayload = {
    id: pluginId,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    type: manifest.type,
    kind: manifest.kind,
    icon: manifest.icon,
    entryPoint: manifest.entryPoint,
    adminEntry: manifest.adminEntry,
    blockEntry: manifest.blockEntry,
    styles: manifest.styles,
    customElement: manifest.customElement,
    serverEntry: backendMeta.serverEntry,
    migrations: backendMeta.migrations,
    models: backendMeta.models,
    permissions: backendMeta.permissions,
    installHook: backendMeta.installHook,
    uninstallHook: backendMeta.uninstallHook,
    dependencies: backendMeta.dependencies,
  };

  await fs.writeFile(
    path.join(publicPluginDir, 'manifest.json'),
    JSON.stringify(manifestPayload, null, 2),
    'utf8'
  );

  if (backendMeta.hasBackend) {
    await fs.writeFile(
      path.join(backendPluginDir, 'manifest.json'),
      JSON.stringify(manifestPayload, null, 2),
      'utf8'
    );
  }

  const frontendPaths = extractedRelativePaths.filter(shouldExtractToFrontend);
  const resolved = resolvePluginKind(manifest, frontendPaths);

  if (resolved.kind === 'block') {
    if (!resolved.entryPoint) {
      throw new Error('Block plugin requires an entryPoint');
    }
    await assertFileExists(
      path.join(publicPluginDir, resolved.entryPoint),
      `manifest.json entryPoint "${resolved.entryPoint}"`
    );
  } else {
    if (!resolved.adminEntry) {
      throw new Error('System plugin requires an adminEntry');
    }
    await assertFileExists(
      path.join(publicPluginDir, resolved.adminEntry),
      `System plugin admin entry "${resolved.adminEntry}"`
    );
    if (resolved.blockEntry) {
      await assertFileExists(
        path.join(publicPluginDir, resolved.blockEntry),
        `System plugin block entry "${resolved.blockEntry}"`
      );
    }
  }

  for (const stylePath of resolved.styles) {
    await assertFileExists(
      path.join(publicPluginDir, stylePath),
      `manifest.json styles entry "${stylePath}"`
    );
  }

  const publicEntry = resolved.entryPoint
    ? toPublicPluginPath(pluginId, resolved.entryPoint)
    : undefined;
  const publicAdmin = resolved.adminEntry
    ? toPublicPluginPath(pluginId, resolved.adminEntry)
    : undefined;
  const publicBlock = resolved.blockEntry
    ? toPublicPluginPath(pluginId, resolved.blockEntry)
    : undefined;

  return {
    manifest: {
      ...manifest,
      pluginId,
      kind: resolved.kind,
      type: resolved.type,
      entryPoint: resolved.entryPoint,
      adminEntry: resolved.adminEntry,
      blockEntry: resolved.blockEntry,
      styles: resolved.styles,
    },
    kind: resolved.kind,
    entryPoint: publicEntry,
    adminEntry: publicAdmin,
    blockEntry: publicBlock,
    styles: resolved.styles.map((stylePath) => toPublicPluginPath(pluginId, stylePath)),
    hasBackend: backendMeta.hasBackend,
    serverEntry: backendMeta.serverEntry,
    migrations: backendMeta.migrations,
    models: backendMeta.models,
    permissions: backendMeta.permissions,
    installHook: backendMeta.installHook,
    uninstallHook: backendMeta.uninstallHook,
    dependencies: backendMeta.dependencies,
  };
}
