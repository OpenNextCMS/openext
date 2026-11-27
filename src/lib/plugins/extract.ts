import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import {
  hasBlockedExtension,
  isSafeRelativePath,
  parsePluginManifest,
  isAdminMountPath,
  resolvePluginKind,
  type ParsedPluginManifest,
  type PluginKind,
} from '@/lib/plugins/manifest';
import {
  ensurePluginsDirectory,
  getPluginDirectory,
  toPublicPluginPath,
} from '@/lib/plugins/storage';
import { getMaxPluginFiles } from '@/lib/plugins/uploadLimits';
import {
  ensureBackendPluginsDirectory,
  getBackendPluginDirectory,
} from '@/lib/plugins/server/storage';
import {
  shouldExtractToBackend,
  shouldExtractToFrontend,
  validateBackendManifest,
} from '@/lib/plugins/server/validation';
import { type PluginUserTypeDraft } from '@/lib/rbac/pluginUserTypes';
import { resolvePluginRolesForUpload } from '@/lib/plugins/loadPluginRoles';
import {
  PLUGIN_MANIFEST_FILE,
  resolvePluginPackageRootInZip,
} from '@/lib/plugins/pluginLayout';
import { compilePluginTypeScript } from '@/lib/plugins/compile';

/** Reject extension packages before the complete-plugin installer writes any files. */
export function assertCompletePluginPackage(manifest: { type?: string }): void {
  if (manifest.type === 'plugin-extension') {
    throw new Error(
      'manifest.json "type" is "plugin-extension". Install extension packages from Dashboard → Extensions, not the plugin uploader.'
    );
  }
}

export interface ExtractedPlugin {
  manifest: ParsedPluginManifest & { kind: PluginKind; type: string };
  kind: PluginKind;
  /** Public URL for canvas block entry (block plugins, or system with block/). */
  entryPoint?: string;
  /** @deprecated Public URL for optional HTML; dashboard uses adminMount. */
  adminEntry?: string;
  /** Public URL for dashboard ESM mount module. */
  adminMount?: string;
  /** Sidebar navigation pages for system plugins. */
  adminNav?: import('@/types/index').PluginAdminNavItem[];
  /** Public URL for optional system placeable block. */
  blockEntry?: string;
  styles: string[];
  hasBackend: boolean;
  serverEntry?: string;
  migrations: string[];
  models: string[];
  permissions: string[];
  userTypes: PluginUserTypeDraft[];
  /** Pages/features/permissions catalog for custom-role pickers. */
  featureCatalog: import('@/lib/plugins/pluginRolesSchema').PluginFeatureCatalog;
  installHook?: string;
  uninstallHook?: string;
  dependencies: string[];
}

function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

/** Map a normalized ZIP path back to the key JSZip uses (may contain backslashes). */
function resolveZipEntryPath(filePaths: string[], logicalPath: string): string | undefined {
  const target = normalizeZipPath(logicalPath);
  return filePaths.find((filePath) => normalizeZipPath(filePath) === target);
}

async function readManifest(
  zip: JSZip,
  manifestPath: string,
  filePaths: string[]
): Promise<ParsedPluginManifest> {
  const zipEntryPath = resolveZipEntryPath(filePaths, manifestPath) ?? manifestPath;
  const manifestFile = zip.file(zipEntryPath);
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

function findManifestPathInZip(filePaths: string[]): string {
  const candidates = filePaths.filter((filePath) => {
    const normalized = normalizeZipPath(filePath);
    return (
      !normalized.endsWith('/') &&
      (normalized === PLUGIN_MANIFEST_FILE || normalized.endsWith(`/${PLUGIN_MANIFEST_FILE}`))
    );
  });
  if (candidates.length === 0) {
    throw new Error('manifest.json was not found in the plugin package');
  }
  candidates.sort((a, b) => {
    const na = normalizeZipPath(a);
    const nb = normalizeZipPath(b);
    return nb.split('/').length - na.split('/').length || na.localeCompare(nb);
  });
  return candidates[0];
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
  const fileEntries = Object.entries(zip.files).filter(([filePath, entry]) => {
    if (entry.dir) return false;
    const normalized = normalizeZipPath(filePath);
    return normalized.length > 0 && !normalized.endsWith('/');
  });

  if (fileEntries.length === 0) {
    throw new Error('The plugin package is empty');
  }

  const maxPluginFiles = await getMaxPluginFiles();
  if (fileEntries.length > maxPluginFiles) {
    throw new Error(`Plugin package exceeds the ${maxPluginFiles} file limit`);
  }

  const filePaths = fileEntries.map(([filePath]) => filePath);
  const probeManifestPath = findManifestPathInZip(filePaths);
  const probeManifest = await readManifest(zip, probeManifestPath, filePaths);
  const pluginId = pluginIdOverride || probeManifest.pluginId;
  const { zipPrefix, manifestRelativePath } = resolvePluginPackageRootInZip(filePaths, pluginId);
  const manifestZipPath = `${zipPrefix}${manifestRelativePath}`.replace(/\/+/g, '/').replace(/^\//, '');
  const manifest =
    normalizeZipPath(manifestZipPath) === normalizeZipPath(probeManifestPath)
      ? probeManifest
      : await readManifest(zip, manifestZipPath, filePaths);

  assertCompletePluginPackage(manifest);

  const manifestDir = path.posix.dirname(manifestRelativePath);
  const pluginRootInZip = manifestDir === '.' ? '' : manifestDir;
  const packagePrefix = pluginRootInZip ? `${zipPrefix}${pluginRootInZip}/` : zipPrefix;
  const frontendPluginDir = getPluginDirectory(pluginId);
  const backendPluginDir = getBackendPluginDirectory(pluginId);

  await ensurePluginsDirectory();
  await ensureBackendPluginsDirectory();
  await fs.rm(frontendPluginDir, { recursive: true, force: true });
  await fs.rm(backendPluginDir, { recursive: true, force: true });
  await fs.mkdir(frontendPluginDir, { recursive: true });
  await fs.mkdir(backendPluginDir, { recursive: true });

  const manifestDirPrefix = packagePrefix;
  const extractedRelativePaths: string[] = [];

  for (const [filePath, zipEntry] of fileEntries) {
    const normalized = normalizeZipPath(filePath);
    if (manifestDirPrefix && !normalized.startsWith(manifestDirPrefix)) continue;
    if (normalized === manifestZipPath) continue;

    const relativePath = manifestDirPrefix
      ? normalized.slice(manifestDirPrefix.length)
      : normalized;

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
      const outputPath = path.join(frontendPluginDir, relativePath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, content);
    }
  }

  const compiled = await compilePluginTypeScript({
    frontendDir: frontendPluginDir,
    backendDir: backendPluginDir,
    manifest,
    relativePaths: extractedRelativePaths,
  });
  const compiledManifest = compiled.manifest;
  const compiledRelativePaths = compiled.relativePaths;

  const backendMeta = validateBackendManifest(compiledManifest, compiledRelativePaths);

  const { roles: userTypes, featureCatalog } = await resolvePluginRolesForUpload(
    pluginId,
    backendMeta.hasBackend ? backendPluginDir : null,
    compiledManifest.userTypes,
    backendMeta.permissions,
    compiledManifest.adminNav
  );

  const frontendPaths = compiledRelativePaths.filter(shouldExtractToFrontend);
  const resolved = resolvePluginKind(compiledManifest, frontendPaths);

  const manifestPayload = {
    id: pluginId,
    name: compiledManifest.name,
    version: compiledManifest.version,
    description: compiledManifest.description,
    author: compiledManifest.author,
    type: resolved.type,
    kind: resolved.kind,
    icon: compiledManifest.icon,
    entryPoint: resolved.entryPoint,
    adminEntry: resolved.adminEntry,
    adminMount: resolved.adminMount,
    adminNav: compiledManifest.adminNav,
    blockEntry: resolved.blockEntry,
    styles: resolved.styles,
    customElement: compiledManifest.customElement,
    serverEntry: backendMeta.serverEntry,
    migrations: backendMeta.migrations,
    models: backendMeta.models,
    permissions: backendMeta.permissions,
    // Roles live in api/roles.js — keep empty in written manifest for clarity.
    userTypes: undefined,
    installHook: backendMeta.installHook,
    uninstallHook: backendMeta.uninstallHook,
    dependencies: backendMeta.dependencies,
  };

  await fs.writeFile(
    path.join(frontendPluginDir, 'manifest.json'),
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

  if (resolved.kind === 'block') {
    if (!resolved.entryPoint) {
      throw new Error('Block plugin requires an entryPoint');
    }
    await assertFileExists(
      path.join(frontendPluginDir, resolved.entryPoint),
      `manifest.json entryPoint "${resolved.entryPoint}"`
    );
  } else {
    if (!resolved.adminMount) {
      throw new Error('System plugin requires an adminMount module (export mount/unmount)');
    }
    await assertFileExists(
      path.join(frontendPluginDir, resolved.adminMount),
      `System plugin adminMount "${resolved.adminMount}"`
    );
    if (resolved.adminEntry) {
      await assertFileExists(
        path.join(frontendPluginDir, resolved.adminEntry),
        `System plugin adminEntry "${resolved.adminEntry}"`
      );
    }
    if (resolved.blockEntry) {
      await assertFileExists(
        path.join(frontendPluginDir, resolved.blockEntry),
        `System plugin block entry "${resolved.blockEntry}"`
      );
    }
    if (compiledManifest.adminNav?.length) {
      for (const navItem of compiledManifest.adminNav) {
        // Shared adminMount + pageId: nav entry may point at the same mount module.
        if (!isAdminMountPath(navItem.entry)) {
          throw new Error(
            `manifest.json adminNav "${navItem.label}" entry must be a mount module (.js/.mjs/.ts), got "${navItem.entry}"`
          );
        }
        await assertFileExists(
          path.join(frontendPluginDir, navItem.entry),
          `manifest.json adminNav entry "${navItem.label}" (${navItem.entry})`
        );
      }
    }
  }

  for (const stylePath of resolved.styles) {
    await assertFileExists(
      path.join(frontendPluginDir, stylePath),
      `manifest.json styles entry "${stylePath}"`
    );
  }

  const publicEntry = resolved.entryPoint
    ? toPublicPluginPath(pluginId, resolved.entryPoint)
    : undefined;
  const publicAdmin = resolved.adminEntry
    ? toPublicPluginPath(pluginId, resolved.adminEntry)
    : undefined;
  const publicAdminMount = resolved.adminMount
    ? toPublicPluginPath(pluginId, resolved.adminMount)
    : undefined;
  const publicBlock = resolved.blockEntry
    ? toPublicPluginPath(pluginId, resolved.blockEntry)
    : undefined;
  const publicAdminNav = compiledManifest.adminNav?.map((item) => ({
    ...item,
    entry: toPublicPluginPath(pluginId, item.entry),
  }));

  return {
    manifest: {
      ...compiledManifest,
      pluginId,
      kind: resolved.kind,
      type: resolved.type,
      entryPoint: resolved.entryPoint,
      adminEntry: resolved.adminEntry,
      adminMount: resolved.adminMount,
      adminNav: compiledManifest.adminNav,
      blockEntry: resolved.blockEntry,
      styles: resolved.styles,
    },
    kind: resolved.kind,
    entryPoint: publicEntry,
    adminEntry: publicAdmin,
    adminMount: publicAdminMount,
    adminNav: publicAdminNav,
    blockEntry: publicBlock,
    styles: resolved.styles.map((stylePath) => toPublicPluginPath(pluginId, stylePath)),
    hasBackend: backendMeta.hasBackend,
    serverEntry: backendMeta.serverEntry,
    migrations: backendMeta.migrations,
    models: backendMeta.models,
    permissions: backendMeta.permissions,
    userTypes,
    featureCatalog,
    installHook: backendMeta.installHook,
    uninstallHook: backendMeta.uninstallHook,
    dependencies: backendMeta.dependencies,
  };
}
