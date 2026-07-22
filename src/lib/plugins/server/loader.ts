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
import { clearCjsModuleCache, loadCjsModule } from '@/lib/plugins/server/loadCjsModule';
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

async function loadRouteFiles(app: PluginApp, pluginDir: string): Promise<number> {
  const routesDir = path.join(pluginDir, 'server', 'routes');
  let count = 0;

  try {
    const entries = await fs.readdir(routesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(js|cjs|mjs)$/.test(entry.name)) continue;

      const absolutePath = path.join(routesDir, entry.name);
      const mod = loadCjsModule(absolutePath);
      const candidate = resolveModuleExport(mod);

      if (typeof candidate === 'function') {
        candidate(app);
        count += 1;
        continue;
      }

      if (Array.isArray(candidate)) {
        for (const route of candidate as PluginRouteDefinition[]) {
          if (!route?.method || !route?.path || typeof route?.handler !== 'function') continue;
          app.registerRoute(route.method, route.path, route.handler);
          count += 1;
        }
        continue;
      }

      const routeDef = candidate as PluginRouteDefinition;
      if (routeDef?.method && routeDef?.path && typeof routeDef?.handler === 'function') {
        app.registerRoute(routeDef.method, routeDef.path, routeDef.handler);
        count += 1;
      }
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') throw error;
  }

  return count;
}

async function loadModelFiles(pluginId: string, pluginDir: string, cms: ReturnType<typeof createCmsSdk>): Promise<void> {
  const modelsDir = path.join(pluginDir, 'server', 'models');

  try {
    const entries = await fs.readdir(modelsDir, { withFileTypes: true });
    await cms.database.user();

    for (const entry of entries) {
      if (!entry.isFile() || !/\.(js|cjs|mjs)$/.test(entry.name)) continue;

      const absolutePath = path.join(modelsDir, entry.name);
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
  const serverPath = resolveBackendModulePath(pluginDir, serverEntry);
  const app = new PluginApp();
  const cms = createCmsSdk(pluginId, permissions, null);

  createAuthMiddleware(app);

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
  return loaded;
}

export async function unloadBackendPlugin(pluginId: string): Promise<void> {
  const loaded = getLoadedPlugin(pluginId) ?? removeLoadedPlugin(pluginId);
  if (loaded && typeof loaded.module.shutdown === 'function') {
    await loaded.module.shutdown();
  }
  removeLoadedPlugin(pluginId);
}

export async function reloadBackendPlugin(options: {
  pluginId: string;
  serverEntry: string;
  permissions?: string[];
}): Promise<LoadedPlugin> {
  await unloadBackendPlugin(options.pluginId);
  return loadBackendPlugin(options);
}
