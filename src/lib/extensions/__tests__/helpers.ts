import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { EXTENSION_CAPABILITIES } from '@/lib/extensions/constants';
import type { ExtensionHostAdapter, ExtensionRegistration } from '@/lib/extensions/contracts';
import { clearExtensionHostsForTests, registerExtensionHost } from '@/lib/extensions/hostRegistry';
import type { ExtensionServices } from '@/lib/extensions/lifecycle';
import {
  createMemoryExtensionRepository,
  createMemoryMigrationRepository,
} from '@/lib/extensions/repository';
import { createExtensionStorage } from '@/lib/extensions/storage';
import type { StoredExtension, TargetPluginInfo } from '@/lib/extensions/types';

export const limits = {
  maxZipBytes: 25 * 1024 * 1024,
  maxFiles: 1000,
  maxExtractedBytes: 80 * 1024 * 1024,
  maxFileBytes: 15 * 1024 * 1024,
};

export function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    manifestVersion: 1,
    id: 'sample-notes',
    name: 'Sample Notes',
    version: '1.0.0',
    type: 'plugin-extension',
    description: 'Notes add-on',
    publisher: { name: 'Example' },
    target: { pluginId: 'sample-host', version: '^1.0.0' },
    compatibility: { cms: '>=0.1.0', extensionSdk: '^1.0.0' },
    entry: { frontend: 'ui/pages/index.html' },
    capabilities: ['navigation.register', 'ui.page.register'],
    permissions: [] as string[],
    dependencies: [] as Array<{ id: string; version: string }>,
    contributions: {
      navigation: [{ id: 'notes', label: 'Notes', href: 'ui/pages/index.html' }],
      pages: [{ id: 'notes', title: 'Notes', entry: 'ui/pages/index.html' }],
    },
    ...overrides,
  };
}

export async function zipOf(files: Record<string, string | Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

export function packageFiles(manifest: unknown = baseManifest(), extra: Record<string, string> = {}) {
  return {
    'manifest.json': JSON.stringify(manifest),
    'ui/pages/index.html': '<h1>Notes</h1>',
    ...extra,
  };
}

export async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ext-cms-'));
}

export function targetInfo(partial: Partial<TargetPluginInfo> = {}): TargetPluginInfo {
  return {
    pluginId: 'sample-host',
    version: '1.2.0',
    isActive: true,
    host: {
      sdkVersion: '^1.0.0',
      capabilities: [...EXTENSION_CAPABILITIES],
    },
    ...partial,
  };
}

export function makeServices(
  root: string,
  options: {
    targets?: Record<string, TargetPluginInfo | null>;
    extensions?: StoredExtension[];
  } = {}
): ExtensionServices & { seen: ExtensionRegistration[] } {
  const seen: ExtensionRegistration[] = [];
  const adapter: ExtensionHostAdapter = {
    pluginId: 'sample-host',
    sdkVersion: '^1.0.0',
    capabilities: [...EXTENSION_CAPABILITIES],
    async registerExtension(registration) {
      seen.push(registration);
    },
    async unregisterExtension(extensionId) {
      const index = seen.findIndex((item) => item.extensionId === extensionId);
      if (index >= 0) seen.splice(index, 1);
    },
  };
  registerExtensionHost(adapter);
  return {
    seen,
    repo: createMemoryExtensionRepository(options.extensions),
    migrations: createMemoryMigrationRepository(),
    storage: createExtensionStorage(root),
    limits,
    cmsVersion: '0.1.0',
    actorId: 'admin-1',
    resolveTarget: async (pluginId: string) => {
      if (options.targets && pluginId in options.targets) return options.targets[pluginId];
      if (pluginId === 'sample-host') return targetInfo();
      return null;
    },
  };
}

export async function cleanup(root: string) {
  clearExtensionHostsForTests();
  await fs.rm(root, { recursive: true, force: true });
}
