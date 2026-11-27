import { ExtensionError } from '@/lib/extensions/errors';
import type {
  ExtensionRepository,
  MigrationRecord,
  MigrationRepository,
  StoredExtension,
} from '@/lib/extensions/types';
import type { ExtensionStatus } from '@/lib/extensions/constants';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createMemoryExtensionRepository(
  initial: StoredExtension[] = []
): ExtensionRepository {
  const rows = new Map<string, StoredExtension>();
  const locks = new Map<string, { owner: string; expiresAt: number }>();
  for (const row of initial) rows.set(row.extensionId, clone(row));

  return {
    async findByExtensionId(extensionId) {
      const row = rows.get(extensionId);
      return row ? clone(row) : null;
    },
    async list(filter) {
      return [...rows.values()]
        .filter((row) => {
          if (filter?.targetPluginId && row.targetPluginId !== filter.targetPluginId) return false;
          if (filter?.status && row.status !== filter.status) return false;
          return true;
        })
        .map((row) => clone(row));
    },
    async insertNew(record) {
      if (rows.has(record.extensionId)) {
        throw new ExtensionError(
          'duplicate_installation',
          `Extension "${record.extensionId}" is already installed.`,
          409
        );
      }
      return this.upsert(record);
    },
    async upsert(record) {
      const next = clone(record);
      next.updatedAt = new Date().toISOString();
      if (!next.createdAt) next.createdAt = next.updatedAt;
      rows.set(record.extensionId, next);
      return clone(next);
    },
    async tryLock(extensionId, owner, ttlMs) {
      const now = Date.now();
      const current = locks.get(extensionId);
      if (current && current.expiresAt > now && current.owner !== owner) return false;
      locks.set(extensionId, { owner, expiresAt: now + ttlMs });
      return true;
    },
    async unlock(extensionId, owner) {
      const current = locks.get(extensionId);
      if (current?.owner === owner) locks.delete(extensionId);
    },
  };
}

export function createMemoryMigrationRepository(
  initial: MigrationRecord[] = []
): MigrationRepository {
  const rows = [...initial.map((row) => clone(row))];
  return {
    async has(extensionId, migration) {
      return rows.some((row) => row.extensionId === extensionId && row.migration === migration);
    },
    async record(extensionId, migration, version) {
      if (rows.some((row) => row.extensionId === extensionId && row.migration === migration)) return;
      rows.push({
        extensionId,
        migration,
        version,
        executedAt: new Date().toISOString(),
      });
    },
    async list(extensionId) {
      return rows.filter((row) => row.extensionId === extensionId).map((row) => clone(row));
    },
    async clear(extensionId) {
      for (let index = rows.length - 1; index >= 0; index -= 1) {
        if (rows[index].extensionId === extensionId) rows.splice(index, 1);
      }
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return undefined;
}

export function toStoredExtension(doc: unknown): StoredExtension {
  const row = asRecord(doc);
  const publisher = asRecord(row.publisher);
  return {
    extensionId: String(row.extensionId || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    version: String(row.version || ''),
    targetPluginId: String(row.targetPluginId || ''),
    publisher:
      typeof publisher.name === 'string'
        ? { name: publisher.name, url: typeof publisher.url === 'string' ? publisher.url : undefined }
        : undefined,
    manifest: row.manifest as StoredExtension['manifest'],
    checksum: String(row.checksum || ''),
    storageRef: String(row.storageRef || ''),
    status: row.status as ExtensionStatus,
    sdkCompatibility: String(row.sdkCompatibility || ''),
    dependencies: Array.isArray(row.dependencies)
      ? (row.dependencies as StoredExtension['dependencies'])
      : [],
    requestedPermissions: Array.isArray(row.requestedPermissions)
      ? (row.requestedPermissions as string[])
      : [],
    approvedPermissions: Array.isArray(row.approvedPermissions)
      ? (row.approvedPermissions as string[])
      : [],
    trustedExecution: (row.trustedExecution as StoredExtension['trustedExecution']) || 'pending',
    trustedExecutionBy: typeof row.trustedExecutionBy === 'string' ? row.trustedExecutionBy : undefined,
    trustedExecutionAt: iso(row.trustedExecutionAt),
    installedAt: iso(row.installedAt),
    enabledAt: iso(row.enabledAt),
    lastError: typeof row.lastError === 'string' ? row.lastError : undefined,
    health: (row.health as StoredExtension['health']) || 'unknown',
    history: Array.isArray(row.history) ? (row.history as StoredExtension['history']) : [],
    previousVersion: typeof row.previousVersion === 'string' ? row.previousVersion : undefined,
    previousChecksum: typeof row.previousChecksum === 'string' ? row.previousChecksum : undefined,
    migrationStatus: (row.migrationStatus as StoredExtension['migrationStatus']) || 'none',
    migrationError: typeof row.migrationError === 'string' ? row.migrationError : undefined,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function createMongoExtensionRepository(): ExtensionRepository {
  async function model() {
    const { getUserDbConnection, getPluginExtensionModel } = await import('@/utils/db');
    await getUserDbConnection();
    return getPluginExtensionModel();
  }

  return {
    async findByExtensionId(extensionId) {
      const Model = await model();
      const doc = await Model.findOne({ extensionId }).lean();
      return doc ? toStoredExtension(doc) : null;
    },
    async list(filter) {
      const Model = await model();
      const query: Record<string, unknown> = {};
      if (filter?.targetPluginId) query.targetPluginId = filter.targetPluginId;
      if (filter?.status) query.status = filter.status;
      const docs = await Model.find(query).sort({ updatedAt: -1 }).lean();
      return docs.map((doc) => toStoredExtension(doc));
    },
    async insertNew(record) {
      const Model = await model();
      try {
        const doc = await Model.create(record);
        return toStoredExtension(doc.toObject());
      } catch (error) {
        if ((error as { code?: number }).code === 11000) {
          throw new ExtensionError(
            'duplicate_installation',
            `Extension "${record.extensionId}" is already installed.`,
            409
          );
        }
        throw error;
      }
    },
    async upsert(record) {
      const Model = await model();
      const doc = await Model.findOneAndUpdate(
        { extensionId: record.extensionId },
        { $set: record },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return toStoredExtension(doc);
    },
    async tryLock(extensionId, owner, ttlMs) {
      const Model = await model();
      const now = new Date();
      const existing = await Model.findOne({ extensionId }).select('lockOwner lockExpiresAt').lean();
      if (!existing) return true;
      const updated = await Model.findOneAndUpdate(
        {
          extensionId,
          $or: [
            { lockOwner: { $exists: false } },
            { lockOwner: null },
            { lockOwner: owner },
            { lockExpiresAt: { $lte: now } },
          ],
        },
        { $set: { lockOwner: owner, lockExpiresAt: new Date(now.getTime() + ttlMs) } },
        { new: true }
      ).lean();
      return Boolean(updated);
    },
    async unlock(extensionId, owner) {
      const Model = await model();
      await Model.updateOne(
        { extensionId, lockOwner: owner },
        { $unset: { lockOwner: '', lockExpiresAt: '' } }
      );
    },
  };
}

export function createMongoMigrationRepository(): MigrationRepository {
  async function model() {
    const { getUserDbConnection, getExtensionMigrationModel } = await import('@/utils/db');
    await getUserDbConnection();
    return getExtensionMigrationModel();
  }

  return {
    async has(extensionId, migration) {
      const Model = await model();
      const existing = await Model.findOne({ extensionId, migration }).select('_id').lean();
      return Boolean(existing);
    },
    async record(extensionId, migration, version) {
      const Model = await model();
      try {
        await Model.create({ extensionId, migration, version, executedAt: new Date() });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return;
        throw error;
      }
    },
    async list(extensionId) {
      const Model = await model();
      const docs = await Model.find({ extensionId }).sort({ executedAt: 1 }).lean();
      return docs.map((doc) => ({
        extensionId: String(doc.extensionId),
        migration: String(doc.migration),
        version: String(doc.version),
        executedAt: doc.executedAt instanceof Date ? doc.executedAt.toISOString() : String(doc.executedAt),
      }));
    },
    async clear(extensionId) {
      const Model = await model();
      await Model.deleteMany({ extensionId });
    },
  };
}
