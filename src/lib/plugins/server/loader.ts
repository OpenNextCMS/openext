import fs from 'fs/promises';
import path from 'path';
import { Schema } from 'mongoose';
import { PluginApp } from '@/lib/plugins/server/router';
import { createAuthMiddleware, createCmsSdk } from '@/lib/plugins/server/sdk';
import {
  getLoadedPlugin,
  removeLoadedPlugin,
  setLoadedPlugin,
} from '@/lib/plugins/server/registry';
import { resolveBackendModulePath } from '@/lib/plugins/server/validation';
import { getBackendPluginDirectory, getPluginApiPrefix } from '@/lib/plugins/server/storage';
import { backendModelsDir, backendRoutesDir } from '@/lib/plugins/pluginLayout';
import { clearCjsModuleCache, clearPluginDirectoryModuleCache, loadCjsModule } from '@/lib/plugins/server/loadCjsModule';
import type {
  LoadedPlugin,
  PluginRequest,
  PluginRouteDefinition,
  PluginServerModule,
} from '@/lib/plugins/server/types';

function loadServerModule(absolutePath: string): PluginServerModule {
  clearCjsModuleCache(absolutePath);
  const mod = loadCjsModule(absolutePath) as PluginServerModule | { default?: PluginServerModule };
  return ('default' in mod && mod.default ? mod.default : mod) as PluginServerModule;
}

function resolveModuleExport(mod: unknown): unknown {
  if (mod && typeof mod === 'object' && 'default' in mod) {
    return (mod as { default?: unknown }).default ?? mod;
  }
  return mod;
}

const SKIP_ROUTE_DIR_NAMES = new Set(['node_modules', '.git', '__tests__', 'test', 'tests']);

function isAutoLoadRouteFile(fileName: string): boolean {
  if (fileName.startsWith('_') || fileName.startsWith('.')) return false;
  return /\.(js|cjs|mjs)$/.test(fileName);
}

/**
 * Collect route modules under `api/routes/` (and nested folders) in a stable order.
 * Nested layouts like `api/routes/customers/list.js` are supported.
 * Skip helper files whose names start with `_` (e.g. `_shared.js`).
 */
async function listRouteModuleFiles(routesDir: string): Promise<string[]> {
  const collected: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_ROUTE_DIR_NAMES.has(entry.name)) continue;
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile() || !isAutoLoadRouteFile(entry.name)) continue;
      collected.push(absolutePath);
    }
  }

  await walk(routesDir);
  return collected;
}

async function registerRouteModule(app: PluginApp, absolutePath: string): Promise<number> {
  clearCjsModuleCache(absolutePath);
  const mod = loadCjsModule(absolutePath);
  const candidate = resolveModuleExport(mod);
  let count = 0;

  if (typeof candidate === 'function') {
    candidate(app);
    return 1;
  }

  if (Array.isArray(candidate)) {
    for (const route of candidate as PluginRouteDefinition[]) {
      if (!route?.method || !route?.path || typeof route?.handler !== 'function') continue;
      app.registerRoute(route.method, route.path, route.handler);
      count += 1;
    }
    return count;
  }

  const routeDef = candidate as PluginRouteDefinition;
  if (routeDef?.method && routeDef?.path && typeof routeDef?.handler === 'function') {
    app.registerRoute(routeDef.method, routeDef.path, routeDef.handler);
    return 1;
  }

  return 0;
}

async function registerRoutesFromDir(app: PluginApp, routesDir: string): Promise<number> {
  const files = await listRouteModuleFiles(routesDir);
  let count = 0;
  for (const absolutePath of files) {
    count += await registerRouteModule(app, absolutePath);
  }
  return count;
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') return false;
    throw error;
  }
}

async function loadRouteFiles(app: PluginApp, pluginDir: string): Promise<number> {
  const primaryDir = backendRoutesDir(pluginDir);
  const legacyDir = path.join(pluginDir, 'server', 'routes');

  if (await directoryExists(primaryDir)) {
    return registerRoutesFromDir(app, primaryDir);
  }

  if (await directoryExists(legacyDir)) {
    return registerRoutesFromDir(app, legacyDir);
  }

  return 0;
}

async function registerModelsFromDir(
  pluginDir: string,
  modelsDir: string,
  cms: ReturnType<typeof createCmsSdk>
): Promise<void> {
  const entries = await fs.readdir(modelsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(js|cjs|mjs)$/.test(entry.name)) continue;

    const absolutePath = path.join(modelsDir, entry.name);
    clearCjsModuleCache(absolutePath);
    const mod = loadCjsModule(absolutePath);
    const candidate = resolveModuleExport(mod);

    const modelExport = candidate as
      | Schema
      | { name?: string; schema?: Schema; register?: (cms: ReturnType<typeof createCmsSdk>) => Promise<void> };

    if (modelExport instanceof Schema) {
      const modelName = entry.name.replace(/\.(js|cjs|mjs)$/, '');
      cms.models.register(modelName, modelExport);
      continue;
    }

    if (typeof modelExport?.name === 'string' && modelExport?.schema instanceof Schema) {
      cms.models.register(modelExport.name, modelExport.schema);
      continue;
    }

    if (typeof modelExport?.register === 'function') {
      await modelExport.register(cms);
    }
  }
}

async function loadModelFiles(
  pluginId: string,
  pluginDir: string,
  cms: ReturnType<typeof createCmsSdk>
): Promise<void> {
  await cms.database.user();

  const primaryDir = backendModelsDir(pluginDir);
  const legacyDir = path.join(pluginDir, 'server', 'models');

  try {
    await registerModelsFromDir(pluginDir, primaryDir, cms);
    return;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }

  try {
    await registerModelsFromDir(pluginDir, legacyDir, cms);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }
}

export async function loadBackendPlugin(options: {
  pluginId: string;
  serverEntry: string;
  permissions?: string[];
}): Promise<LoadedPlugin> {
  const { pluginId, serverEntry, permissions = [] } = options;
  const pluginDir = getBackendPluginDirectory(pluginId);
  clearPluginDirectoryModuleCache(pluginDir);
  const serverPath = resolveBackendModulePath(pluginDir, serverEntry);
  const app = new PluginApp();
  const cms = createCmsSdk(pluginId, permissions, null);

  createAuthMiddleware(app, [], ['/health']);

  app.use(async (req, _res, next) => {
    (req as PluginRequest).cms = cms;
    await next();
  });

  await loadModelFiles(pluginId, pluginDir, cms);
  await loadRouteFiles(app, pluginDir);

  const pluginModule = loadServerModule(serverPath);

  if (typeof pluginModule.register === 'function') {
    await pluginModule.register({ app, cms });
  }

  if (typeof pluginModule.boot === 'function') {
    await pluginModule.boot({ app, cms });
  }

  const loaded: LoadedPlugin = {
    pluginId,
    serverEntry,
    apiPrefix: getPluginApiPrefix(pluginId),
    app,
    module: pluginModule,
    permissions,
    loadedAt: new Date(),
  };

  setLoadedPlugin(loaded);

  try {
    const { attachPluginExtensionHost } = await import('@/lib/extensions/hostRegistry');
    const { reattachEnabledExtensions } = await import('@/lib/extensions/lifecycle');
    const attached = await attachPluginExtensionHost(pluginId, pluginModule.extensionHost);
    if (attached === 'registered') {
      await reattachEnabledExtensions(pluginId);
    }
  } catch (error) {
    console.error(`[plugin:${pluginId}] extension host registration failed:`, error);
  }

  return loaded;
}

export async function unloadBackendPlugin(pluginId: string): Promise<void> {
  const loaded = getLoadedPlugin(pluginId) ?? removeLoadedPlugin(pluginId);
  if (loaded && typeof loaded.module.shutdown === 'function') {
    try {
      await loaded.module.shutdown();
    } catch (error) {
      console.error(`[plugin:${pluginId}] shutdown failed during unload:`, error);
    }
  }
  removeLoadedPlugin(pluginId);

  try {
    const { detachPluginExtensionHost } = await import('@/lib/extensions/hostRegistry');
    const { markTargetExtensionsDegraded } = await import('@/lib/extensions/lifecycle');
    detachPluginExtensionHost(pluginId);
    await markTargetExtensionsDegraded(pluginId);
  } catch (error) {
    console.error(`[plugin:${pluginId}] extension host detach failed:`, error);
  }

  // Release require() locks so Windows can delete plugin files after unload.
  try {
    clearPluginDirectoryModuleCache(getBackendPluginDirectory(pluginId));
  } catch {
    // Directory may already be gone
  }
}

export async function reloadBackendPlugin(options: {
  pluginId: string;
  serverEntry: string;
  permissions?: string[];
}): Promise<LoadedPlugin> {
  await unloadBackendPlugin(options.pluginId);
  return loadBackendPlugin(options);
}
