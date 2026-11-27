import fs from 'node:fs/promises';
import path from 'node:path';
import { ExtensionError } from '@/lib/extensions/errors';
import { logExtension } from '@/lib/extensions/logger';
import type { ExtensionMigrationContext } from '@/lib/extensions/contracts';
import type { MigrationRepository } from '@/lib/extensions/types';
import { loadCjsModule } from '@/lib/plugins/server/loadCjsModule';

interface MigrationModule {
  name?: string;
  up?: (context: ExtensionMigrationContext) => void | Promise<void>;
  down?: (context: ExtensionMigrationContext) => void | Promise<void>;
}

function isMigrationFile(fileName: string): boolean {
  return /\.(js|cjs|mjs)$/.test(fileName) && !fileName.startsWith('.');
}

/**
 * Runs trusted extension migrations in filename order.
 * Successful names are recorded and never run again.
 * down() is not called automatically — reversal is not assumed to be safe.
 */
export async function runExtensionMigrations(options: {
  extensionId: string;
  version: string;
  directory: string;
  trusted: boolean;
  repository: MigrationRepository;
  context: ExtensionMigrationContext;
}): Promise<string[]> {
  if (!options.trusted) {
    throw new ExtensionError(
      'trust_required',
      'Migration execution requires an administrator to approve trusted execution.',
      422
    );
  }

  let fileNames: string[] = [];
  try {
    const entries = await fs.readdir(options.directory, { withFileTypes: true });
    fileNames = entries
      .filter((entry) => entry.isFile() && isMigrationFile(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const ran: string[] = [];
  for (const fileName of fileNames) {
    const migrationName = fileName.replace(/\.(js|cjs|mjs)$/, '');
    if (await options.repository.has(options.extensionId, migrationName)) continue;
    const absolutePath = path.join(options.directory, fileName);
    const loaded = loadCjsModule(absolutePath) as MigrationModule | { default?: MigrationModule };
    const migration = 'default' in loaded && loaded.default ? loaded.default : (loaded as MigrationModule);
    if (typeof migration.up !== 'function') {
      throw new ExtensionError(
        'migration_failed',
        `Migration "${migrationName}" must export an up() function.`,
        422
      );
    }
    const label = migration.name || migrationName;
    try {
      await migration.up(options.context);
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : 'Migration failed';
      logExtension('error', 'migration.failed', {
        extensionId: options.extensionId,
        migration: label,
        message,
      });
      throw new ExtensionError('migration_failed', `Migration "${label}" failed: ${message}`, 422);
    }
    await options.repository.record(options.extensionId, label, options.version);
    ran.push(label);
    logExtension('info', 'migration.applied', {
      extensionId: options.extensionId,
      migration: label,
      version: options.version,
    });
  }
  return ran;
}
