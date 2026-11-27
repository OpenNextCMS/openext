import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  UPLOADED_EXTENSIONS_ROOT,
  assertUploadPathNotInPublic,
} from '@/lib/dynamicContent';
import {
  EXTENSION_STORAGE_ENV,
  STAGING_ID_PATTERN,
  STAGING_TTL_MS,
} from '@/lib/extensions/constants';
import { ExtensionError } from '@/lib/extensions/errors';
import { isSafeRelativePath } from '@/lib/plugins/manifest';

export interface ExtensionStorage {
  saveStaging(bytes: Buffer): Promise<string>;
  readStaging(stagingId: string): Promise<Buffer>;
  removeStaging(stagingId: string): Promise<void>;
  writeVersion(
    extensionId: string,
    version: string,
    entries: Map<string, Buffer>,
    zipBytes: Buffer
  ): Promise<string>;
  removeVersion(extensionId: string, version: string): Promise<void>;
  removeExtension(extensionId: string): Promise<void>;
  writeCurrent(extensionId: string, version: string): Promise<void>;
  readCurrent(extensionId: string): Promise<string | null>;
  readManifest(extensionId: string, version: string): Promise<unknown>;
  resolvePublicFile(extensionId: string, version: string, relativePath: string): string;
  resolvePackageFile(extensionId: string, version: string, relativePath: string): string;
  cleanupIncomplete(olderThanMs?: number): Promise<void>;
}

function storageRoot(): string {
  const configured = process.env[EXTENSION_STORAGE_ENV]?.trim();
  const root = configured ? path.resolve(configured) : UPLOADED_EXTENSIONS_ROOT;
  assertUploadPathNotInPublic(root, 'Extension storage');
  return root;
}

function assertId(extensionId: string): void {
  if (!/^[a-z0-9][a-z0-9-_]{1,62}[a-z0-9]$/.test(extensionId)) {
    throw new ExtensionError('invalid_package', 'Extension id is not safe to store.', 400);
  }
}

function assertVersion(version: string): void {
  if (!/^[0-9A-Za-z.+-]{1,40}$/.test(version) || version.includes('..')) {
    throw new ExtensionError('invalid_package', 'Extension version is not safe to store.', 400);
  }
}

function resolveInside(root: string, ...segments: string[]): string {
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ExtensionError('invalid_package', 'Resolved path escapes extension storage.', 400);
  }
  return resolved;
}

async function moveDirectory(from: string, to: string): Promise<void> {
  await fs.mkdir(path.dirname(to), { recursive: true });
  try {
    await fs.rename(from, to);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EXDEV') throw error;
    await fs.cp(from, to, { recursive: true });
    await fs.rm(from, { recursive: true, force: true });
  }
}

export function createExtensionStorage(root = storageRoot()): ExtensionStorage {
  assertUploadPathNotInPublic(root, 'Extension storage');

  function stagingDir(stagingId: string): string {
    if (!STAGING_ID_PATTERN.test(stagingId)) {
      throw new ExtensionError('invalid_package', 'Staging id is not valid.', 400);
    }
    return resolveInside(root, '_staging', stagingId);
  }

  function versionDir(extensionId: string, version: string): string {
    assertId(extensionId);
    assertVersion(version);
    return resolveInside(root, extensionId, 'versions', version);
  }

  return {
    async saveStaging(bytes: Buffer): Promise<string> {
      const stagingId = randomUUID();
      const dir = stagingDir(stagingId);
      await fs.mkdir(dir, { recursive: true });
      const target = resolveInside(dir, 'package.zip');
      const temporary = `${target}.partial`;
      await fs.writeFile(temporary, bytes);
      await fs.rename(temporary, target);
      return stagingId;
    },

    async readStaging(stagingId: string): Promise<Buffer> {
      const filePath = resolveInside(stagingDir(stagingId), 'package.zip');
      try {
        return await fs.readFile(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new ExtensionError('not_found', 'Staged extension package was not found.', 404);
        }
        throw error;
      }
    },

    async removeStaging(stagingId: string): Promise<void> {
      await fs.rm(stagingDir(stagingId), { recursive: true, force: true });
    },

    async writeVersion(extensionId, version, entries, zipBytes): Promise<string> {
      const finalDir = versionDir(extensionId, version);
      try {
        await fs.access(finalDir);
        throw new ExtensionError(
          'duplicate_installation',
          `Version ${version} is already stored for this extension.`,
          409
        );
      } catch (error) {
        if (error instanceof ExtensionError) throw error;
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      const incoming = `${finalDir}.incoming`;
      await fs.rm(incoming, { recursive: true, force: true });
      await fs.mkdir(incoming, { recursive: true });
      try {
        for (const [relativePath, content] of entries) {
          if (!isSafeRelativePath(relativePath)) {
            throw new ExtensionError('invalid_package', `Refusing to store unsafe path "${relativePath}".`, 400);
          }
          const output = resolveInside(incoming, ...relativePath.split('/'));
          await fs.mkdir(path.dirname(output), { recursive: true });
          await fs.writeFile(output, content);
        }
        await fs.writeFile(resolveInside(incoming, 'package.zip'), zipBytes);
        await moveDirectory(incoming, finalDir);
      } catch (error) {
        await fs.rm(incoming, { recursive: true, force: true });
        throw error;
      }
      return path.posix.join(extensionId, 'versions', version);
    },

    async removeVersion(extensionId, version): Promise<void> {
      await fs.rm(versionDir(extensionId, version), { recursive: true, force: true });
      await fs.rm(`${versionDir(extensionId, version)}.incoming`, { recursive: true, force: true });
    },

    async removeExtension(extensionId): Promise<void> {
      assertId(extensionId);
      await fs.rm(resolveInside(root, extensionId), { recursive: true, force: true });
    },

    async writeCurrent(extensionId, version): Promise<void> {
      assertId(extensionId);
      assertVersion(version);
      const extensionDir = resolveInside(root, extensionId);
      await fs.mkdir(extensionDir, { recursive: true });
      const target = resolveInside(extensionDir, 'current.json');
      const temporary = `${target}.partial`;
      await fs.writeFile(temporary, JSON.stringify({ version }));
      await fs.rename(temporary, target);
    },

    async readCurrent(extensionId): Promise<string | null> {
      assertId(extensionId);
      try {
        const raw = await fs.readFile(resolveInside(root, extensionId, 'current.json'), 'utf8');
        const parsed = JSON.parse(raw) as { version?: string };
        return typeof parsed.version === 'string' ? parsed.version : null;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },

    async readManifest(extensionId, version): Promise<unknown> {
      const filePath = resolveInside(versionDir(extensionId, version), 'manifest.json');
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw) as unknown;
    },

    resolvePackageFile(extensionId, version, relativePath): string {
      if (!isSafeRelativePath(relativePath)) {
        throw new ExtensionError('invalid_package', 'Extension package path is not safe.', 400);
      }
      const allowed =
        relativePath === 'manifest.json' ||
        relativePath === 'migrations' ||
        relativePath.startsWith('ui/') ||
        relativePath.startsWith('assets/') ||
        relativePath.startsWith('server/') ||
        relativePath.startsWith('migrations/');
      if (!allowed) {
        throw new ExtensionError('invalid_package', 'Extension package path is not allowed.', 400);
      }
      return resolveInside(versionDir(extensionId, version), ...relativePath.split('/'));
    },

    resolvePublicFile(extensionId, version, relativePath): string {
      if (
        !isSafeRelativePath(relativePath) ||
        !(relativePath.startsWith('ui/') || relativePath.startsWith('assets/'))
      ) {
        throw new ExtensionError('invalid_package', 'Extension asset path is not public.', 400);
      }
      return resolveInside(versionDir(extensionId, version), ...relativePath.split('/'));
    },

    async cleanupIncomplete(olderThanMs = STAGING_TTL_MS): Promise<void> {
      const stagingRoot = path.join(root, '_staging');
      const cutoff = Date.now() - olderThanMs;
      let stagingEntries: import('node:fs').Dirent[] = [];
      try {
        stagingEntries = await fs.readdir(stagingRoot, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      for (const entry of stagingEntries) {
        if (!entry.isDirectory() || !STAGING_ID_PATTERN.test(entry.name)) continue;
        const dir = path.join(stagingRoot, entry.name);
        const stat = await fs.stat(dir);
        if (stat.mtimeMs <= cutoff) {
          await fs.rm(dir, { recursive: true, force: true });
        }
      }

      let extensionDirs: import('node:fs').Dirent[] = [];
      try {
        extensionDirs = await fs.readdir(root, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      for (const extensionDir of extensionDirs) {
        if (!extensionDir.isDirectory() || extensionDir.name.startsWith('_')) continue;
        const versionsDir = path.join(root, extensionDir.name, 'versions');
        let versions: import('node:fs').Dirent[] = [];
        try {
          versions = await fs.readdir(versionsDir, { withFileTypes: true });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          continue;
        }
        for (const version of versions) {
          if (version.isDirectory() && version.name.endsWith('.incoming')) {
            await fs.rm(path.join(versionsDir, version.name), { recursive: true, force: true });
          }
        }
      }
    },
  };
}

export function getDefaultExtensionStorage(): ExtensionStorage {
  return createExtensionStorage();
}
