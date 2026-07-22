import fs from 'fs/promises';
import path from 'path';
import { getUserDbConnection } from '@/utils/db';
import { getPluginMigrationModel } from '@/utils/db';
import { loadCjsModule } from '@/lib/plugins/server/loadCjsModule';
import { createCmsSdk, type CmsSdk } from '@/lib/plugins/server/sdk';
import { resolveBackendModulePath } from '@/lib/plugins/server/validation';
import { getBackendPluginDirectory } from '@/lib/plugins/server/storage';
import type { PluginMigrationModule } from '@/lib/plugins/server/types';

function isMigrationFile(fileName: string): boolean {
  return /\.(js|cjs|mjs)$/.test(fileName) && !fileName.startsWith('.');
}

async function listMigrationFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isMigrationFile(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') return [];
    throw error;
  }
}

function loadMigrationModule(absolutePath: string): PluginMigrationModule {
  const mod = loadCjsModule(absolutePath) as
    | PluginMigrationModule
    | { default?: PluginMigrationModule };
  const candidate = ('default' in mod && mod.default ? mod.default : mod) as PluginMigrationModule;

  if (typeof candidate?.up !== 'function') {
    throw new Error(`Migration "${path.basename(absolutePath)}" must export an up() function`);
  }

  return {
    name: typeof candidate.name === 'string' ? candidate.name : path.basename(absolutePath, path.extname(absolutePath)),
    up: candidate.up,
    down: typeof candidate.down === 'function' ? candidate.down : undefined,
  };
}

export async function runPluginMigrations(
  pluginId: string,
  migrationDirs: string[],
  permissions: string[] = []
): Promise<string[]> {
  await getUserDbConnection();
  const MigrationModel = getPluginMigrationModel();
  const pluginDir = getBackendPluginDirectory(pluginId);
  const cms = createCmsSdk(pluginId, permissions, null);
  await cms.database.user();

  const executed: string[] = [];

  for (const migrationDir of migrationDirs) {
    const absoluteDir = resolveBackendModulePath(pluginDir, migrationDir);
    const files = await listMigrationFiles(absoluteDir);

    for (const fileName of files) {
      const migrationName = fileName.replace(/\.(js|cjs|mjs)$/, '');
      const existing = await MigrationModel.findOne({ plugin: pluginId, migration: migrationName }).lean();
      if (existing) continue;

      const absolutePath = path.join(absoluteDir, fileName);
      const migration = loadMigrationModule(absolutePath);

      await migration.up(cms);

      await MigrationModel.create({
        plugin: pluginId,
        migration: migration.name || migrationName,
        executedAt: new Date(),
      });

      executed.push(migration.name || migrationName);
    }
  }

  return executed;
}

export async function getPluginMigrationHistory(pluginId: string): Promise<string[]> {
  await getUserDbConnection();
  const MigrationModel = getPluginMigrationModel();
  const rows = await MigrationModel.find({ plugin: pluginId }).sort({ executedAt: 1 }).lean();
  return rows.map((row) => row.migration);
}

export async function clearPluginMigrationHistory(pluginId: string): Promise<void> {
  await getUserDbConnection();
  const MigrationModel = getPluginMigrationModel();
  await MigrationModel.deleteMany({ plugin: pluginId });
}

export type { CmsSdk };
