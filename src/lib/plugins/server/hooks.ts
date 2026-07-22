import fs from 'fs/promises';
import path from 'path';
import { loadCjsModule } from '@/lib/plugins/server/loadCjsModule';
import { createCmsSdk } from '@/lib/plugins/server/sdk';
import { resolveBackendModulePath } from '@/lib/plugins/server/validation';
import { getBackendPluginDirectory } from '@/lib/plugins/server/storage';
import type { CmsSdk } from '@/lib/plugins/server/migrations';

function loadHookModule(absolutePath: string): (cms: CmsSdk) => void | Promise<void> {
  const mod = loadCjsModule(absolutePath);
  const candidate = mod && typeof mod === 'object' && 'default' in mod
    ? (mod as { default?: unknown }).default ?? mod
    : mod;

  if (typeof candidate === 'function') {
    return candidate as (cms: CmsSdk) => void | Promise<void>;
  }

  if (
    candidate &&
    typeof candidate === 'object' &&
    typeof (candidate as { run?: unknown }).run === 'function'
  ) {
    return (candidate as { run: (cms: CmsSdk) => void | Promise<void> }).run;
  }

  throw new Error(`Hook "${path.basename(absolutePath)}" must export a function or { run() }`);
}

export async function runInstallHook(
  pluginId: string,
  hookPath: string | undefined,
  permissions: string[] = []
): Promise<void> {
  if (!hookPath) return;

  const pluginDir = getBackendPluginDirectory(pluginId);
  const absolutePath = resolveBackendModulePath(pluginDir, hookPath);
  const hook = loadHookModule(absolutePath);
  const cms = createCmsSdk(pluginId, permissions, null);
  await cms.database.user();
  await hook(cms);
}

export async function runUninstallHook(
  pluginId: string,
  hookPath: string | undefined,
  permissions: string[] = []
): Promise<void> {
  if (!hookPath) return;

  const pluginDir = getBackendPluginDirectory(pluginId);
  const absolutePath = resolveBackendModulePath(pluginDir, hookPath);
  const hook = loadHookModule(absolutePath);
  const cms = createCmsSdk(pluginId, permissions, null);
  await cms.database.user();
  await hook(cms);
}

export async function installPluginDependencies(
  pluginId: string,
  dependencies: string[],
  allowNative = false
): Promise<void> {
  if (dependencies.length === 0) return;

  const pluginDir = getBackendPluginDirectory(pluginId);
  const packageJsonPath = path.join(pluginDir, 'package.json');

  try {
    await fs.access(packageJsonPath);
  } catch {
    return;
  }

  if (!allowNative && process.env.PLUGIN_ALLOW_NATIVE_DEPS !== 'true') {
    console.warn(
      `[plugin:${pluginId}] Skipping npm install (${dependencies.length} dependencies). Set PLUGIN_ALLOW_NATIVE_DEPS=true to enable.`
    );
    return;
  }

  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  await execFileAsync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: pluginDir,
    env: { ...process.env, NODE_ENV: 'production' },
  });
}
