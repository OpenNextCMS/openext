import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  EXTENSION_HISTORY_LIMIT,
  EXTENSION_LOCK_TTL_MS,
  type ExtensionStatus,
} from '@/lib/extensions/constants';
import {
  assessDependencies,
  assessTarget,
  dependentsOf,
  enabledDependents,
} from '@/lib/extensions/compatibility';
import type { ExtensionRegistration } from '@/lib/extensions/contracts';
import { ExtensionError, safeErrorMessage, validationToError } from '@/lib/extensions/errors';
import { forgetRegistration, getExtensionHost, rememberRegistration } from '@/lib/extensions/hostRegistry';
import { logExtension } from '@/lib/extensions/logger';
import { runExtensionMigrations } from '@/lib/extensions/migrationRunner';
import type { ExtensionManifest } from '@/lib/extensions/schema';
import type { ExtensionStorage } from '@/lib/extensions/storage';
import {
  createExtensionContext,
  createMigrationContext,
  executeTrustedBackend,
  shutdownTrustedBackend,
} from '@/lib/extensions/trustedRuntime';
import type {
  ExtensionRepository,
  ExtensionValidationResult,
  MigrationRepository,
  StoredExtension,
  TargetPluginInfo,
  ValidationContext,
} from '@/lib/extensions/types';
import { compileExtensionEntries } from '@/lib/extensions/compile';
import { validateExtensionPackage } from '@/lib/extensions/validate';
import { inspectExtensionArchive } from '@/lib/extensions/zipInspect';

export interface ExtensionServices {
  repo: ExtensionRepository;
  migrations: MigrationRepository;
  storage: ExtensionStorage;
  limits: ValidationContext['limits'];
  cmsVersion: string;
  resolveTarget: (pluginId: string) => Promise<TargetPluginInfo | null>;
  actorId?: string;
  /** Runs inside the lock after files are written and before the registry commit. */
  beforeCommit?: () => Promise<void>;
  runMigrations?: typeof runExtensionMigrations;
  executeBackend?: typeof executeTrustedBackend;
}

const processLocks = new Set<string>();

function validationContext(
  services: ExtensionServices,
  mode: 'install' | 'update',
  extras: { expectedExtensionId?: string; approvedPermissions?: string[] } = {}
): ValidationContext {
  return {
    limits: services.limits,
    cmsVersion: services.cmsVersion,
    mode,
    expectedExtensionId: extras.expectedExtensionId,
    approvedPermissions: extras.approvedPermissions,
    resolveTarget: services.resolveTarget,
    listExtensions: () => services.repo.list(),
  };
}

async function withExtensionLock<T>(
  services: ExtensionServices,
  extensionId: string,
  fn: () => Promise<T>
): Promise<T> {
  if (processLocks.has(extensionId)) {
    throw new ExtensionError('conflict', 'Another extension operation is already in progress.', 409);
  }
  processLocks.add(extensionId);
  const owner = randomUUID();
  let locked = false;
  try {
    locked = await services.repo.tryLock(extensionId, owner, EXTENSION_LOCK_TTL_MS);
    if (!locked) {
      throw new ExtensionError('conflict', 'Another extension operation is already in progress.', 409);
    }
    return await fn();
  } finally {
    if (locked) await services.repo.unlock(extensionId, owner).catch(() => undefined);
    processLocks.delete(extensionId);
  }
}

function withHistory(
  history: StoredExtension['history'],
  entry: Omit<StoredExtension['history'][number], 'at'>
): StoredExtension['history'] {
  return [...history, { ...entry, at: new Date().toISOString() }].slice(-EXTENSION_HISTORY_LIMIT);
}

async function requireExtension(services: ExtensionServices, extensionId: string): Promise<StoredExtension> {
  const record = await services.repo.findByExtensionId(extensionId);
  if (!record || record.status === 'uninstalled') {
    throw new ExtensionError('not_found', 'Extension was not found.', 404);
  }
  return record;
}

function toRegistration(record: StoredExtension): ExtensionRegistration {
  return {
    extensionId: record.extensionId,
    version: record.version,
    targetPluginId: record.targetPluginId,
    capabilities: [...record.manifest.capabilities],
    permissions: [...record.approvedPermissions],
    contributions: record.manifest.contributions,
    entry: record.manifest.entry,
  };
}

function assertEnableChecks(
  record: StoredExtension,
  target: TargetPluginInfo | null,
  installed: StoredExtension[]
): void {
  const targetIssues = assessTarget(record.manifest, target);
  if (targetIssues.length > 0) {
    throw validationToError(
      targetIssues[0].status,
      targetIssues,
      'Extension is not compatible with its target plugin.'
    );
  }
  if (!target?.isActive) {
    throw new ExtensionError(
      'target_inactive',
      `Target plugin "${record.targetPluginId}" is installed but not enabled.`,
      409
    );
  }
  const dependencyIssues = assessDependencies(record.manifest, installed, { requireEnabled: true });
  if (dependencyIssues.length > 0) {
    throw validationToError('missing_dependency', dependencyIssues, 'Required extensions are missing or not enabled.');
  }
  const pending = record.requestedPermissions.filter(
    (permission) => !record.approvedPermissions.includes(permission)
  );
  if (pending.length > 0) {
    throw new ExtensionError(
      'permission_approval_required',
      `Approve permissions before enabling: ${pending.join(', ')}.`,
      422,
      pending.map((permission) => ({
        code: 'permission_approval_required',
        message: `Permission "${permission}" has not been approved.`,
      }))
    );
  }
}

async function applyMigrations(record: StoredExtension, services: ExtensionServices): Promise<string[]> {
  if (!record.manifest.migrations) return [];
  if (record.trustedExecution !== 'approved') {
    throw new ExtensionError(
      'trust_required',
      'This extension includes migrations. Approve trusted execution before enabling it.',
      422
    );
  }
  const declared = record.manifest.migrations;
  const isFile = /\.(js|cjs|mjs)$/.test(declared);
  const directory = isFile
    ? path.dirname(services.storage.resolvePackageFile(record.extensionId, record.version, declared))
    : services.storage.resolvePackageFile(record.extensionId, record.version, declared);
  const run = services.runMigrations ?? runExtensionMigrations;
  return run({
    extensionId: record.extensionId,
    version: record.version,
    directory,
    trusted: true,
    repository: services.migrations,
    context: createMigrationContext({ extensionId: record.extensionId, version: record.version }),
  });
}

async function applyHost(record: StoredExtension, services: ExtensionServices): Promise<void> {
  const host = getExtensionHost(record.targetPluginId);
  if (!host) {
    throw new ExtensionError(
      'unsupported_sdk',
      `Target plugin "${record.targetPluginId}" is not advertising an extension host.`,
      422
    );
  }
  const registration = toRegistration(record);
  await host.registerExtension(registration);
  rememberRegistration(registration);
  if (record.trustedExecution === 'approved' && record.manifest.entry?.backend) {
    const absolute = services.storage.resolvePackageFile(
      record.extensionId,
      record.version,
      record.manifest.entry.backend
    );
    const execute = services.executeBackend ?? executeTrustedBackend;
    await execute(
      absolute,
      createExtensionContext({ registration, approvedPermissions: record.approvedPermissions })
    );
  }
}

async function detachHost(record: StoredExtension): Promise<void> {
  const host = getExtensionHost(record.targetPluginId);
  try {
    await host?.unregisterExtension(record.extensionId);
  } catch (error) {
    logExtension('error', 'host.unregister_failed', {
      extensionId: record.extensionId,
      message: safeErrorMessage(error),
    });
  }
  forgetRegistration(record.extensionId);
  await shutdownTrustedBackend(record.extensionId);
}

function buildInstalledRecord(
  manifest: ExtensionManifest,
  validation: ExtensionValidationResult,
  storageRef: string,
  existing: StoredExtension | null,
  actorId?: string
): StoredExtension {
  const now = new Date().toISOString();
  const sameBytes = existing?.checksum === validation.checksum;
  return {
    extensionId: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    targetPluginId: manifest.target.pluginId,
    publisher: manifest.publisher,
    manifest,
    checksum: validation.checksum,
    storageRef,
    status: 'installed',
    sdkCompatibility: manifest.compatibility.extensionSdk,
    dependencies: manifest.dependencies,
    requestedPermissions: manifest.permissions,
    approvedPermissions: (existing?.approvedPermissions ?? []).filter((permission) =>
      manifest.permissions.includes(permission)
    ),
    trustedExecution: sameBytes ? existing!.trustedExecution : 'pending',
    trustedExecutionBy: sameBytes ? existing?.trustedExecutionBy : undefined,
    trustedExecutionAt: sameBytes ? existing?.trustedExecutionAt : undefined,
    installedAt: now,
    health: 'unknown',
    history: withHistory(existing?.history ?? [], {
      action: 'install',
      fromStatus: existing?.status,
      toStatus: 'installed',
      version: manifest.version,
      message: 'Extension package stored. It is not enabled yet.',
      actorId,
    }),
    previousVersion: undefined,
    previousChecksum: undefined,
    migrationStatus: manifest.migrations ? 'pending' : 'none',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function uploadExtensionPackage(bytes: Buffer, services: ExtensionServices) {
  await services.storage.cleanupIncomplete().catch(() => undefined);
  const validation = await validateExtensionPackage(bytes, validationContext(services, 'install'));
  logExtension(validation.installable ? 'info' : 'warn', 'upload.validated', {
    status: validation.status,
    extensionId: validation.manifest?.id,
    checksum: validation.checksum,
  });
  if (!validation.security.zipValid || !validation.security.pathSafety) {
    return { stagingId: null as string | null, validation };
  }
  const stagingId = await services.storage.saveStaging(bytes);
  return { stagingId, validation };
}

export async function revalidateStagedExtension(stagingId: string, services: ExtensionServices) {
  const bytes = await services.storage.readStaging(stagingId);
  const validation = await validateExtensionPackage(bytes, validationContext(services, 'install'));
  return { stagingId, validation };
}

export async function installStagedExtension(stagingId: string, services: ExtensionServices) {
  const bytes = await services.storage.readStaging(stagingId);
  const preview = await validateExtensionPackage(bytes, validationContext(services, 'install'));
  if (!preview.manifest) {
    throw validationToError(preview.status, preview.errors, 'Extension package is not installable.');
  }
  return withExtensionLock(services, preview.manifest.id, async () => {
    const validation = await validateExtensionPackage(bytes, validationContext(services, 'install'));
    if (!validation.installable || !validation.manifest) {
      throw validationToError(validation.status, validation.errors, 'Extension package is not installable.');
    }
    const manifest = validation.manifest;
    const existing = await services.repo.findByExtensionId(manifest.id);
    if (existing && existing.status !== 'failed' && existing.status !== 'uninstalled') {
      throw new ExtensionError('duplicate_installation', `Extension "${manifest.id}" is already installed.`, 409);
    }
    if (existing) await services.storage.removeExtension(manifest.id);
    const inspected = await inspectExtensionArchive(bytes, services.limits);
    if (!inspected.ok) {
      throw validationToError('invalid_package', inspected.errors, 'Extension package failed inspection.');
    }
    let wrote = false;
    let inserted = false;
    try {
      const compiled = compileExtensionEntries(inspected.entries, manifest);
      const storageRef = await services.storage.writeVersion(
        compiled.manifest.id,
        compiled.manifest.version,
        compiled.entries,
        bytes
      );
      wrote = true;
      await services.beforeCommit?.();
      const record = buildInstalledRecord(
        compiled.manifest,
        validation,
        storageRef,
        existing,
        services.actorId
      );
      const saved = existing ? await services.repo.upsert(record) : await services.repo.insertNew(record);
      inserted = !existing;
      await services.storage.writeCurrent(compiled.manifest.id, compiled.manifest.version);
      await services.storage.removeStaging(stagingId);
      logExtension('info', 'install.succeeded', {
        extensionId: compiled.manifest.id,
        version: compiled.manifest.version,
        compiled: compiled.compiled,
      });
      return {
        extension: saved,
        validation: { ...validation, manifest: compiled.manifest },
      };
    } catch (error) {
      if (wrote) await services.storage.removeVersion(manifest.id, manifest.version).catch(() => undefined);
      if (inserted) {
        const failed = await services.repo.findByExtensionId(manifest.id);
        if (failed) {
          await services.repo.upsert({
            ...failed,
            status: 'failed',
            health: 'error',
            lastError: safeErrorMessage(error),
          });
        }
      }
      logExtension('error', 'install.failed', { extensionId: manifest.id, message: safeErrorMessage(error) });
      throw error;
    }
  });
}

export async function enableExtension(extensionId: string, services: ExtensionServices) {
  return withExtensionLock(services, extensionId, async () => {
    const record = await requireExtension(services, extensionId);
    const installed = await services.repo.list();
    const target = await services.resolveTarget(record.targetPluginId);
    assertEnableChecks(record, target, installed);

    if (record.status === 'enabled') {
      try {
        await applyHost(record, services);
        return record;
      } catch (error) {
        await services.repo.upsert({
          ...record,
          health: 'degraded',
          lastError: safeErrorMessage(error),
        });
        throw error;
      }
    }

    if (record.status !== 'installed' && record.status !== 'disabled' && record.status !== 'failed') {
      throw new ExtensionError('invalid_state', `Cannot enable an extension that is ${record.status}.`, 409);
    }
    if (record.manifest.migrations && record.trustedExecution !== 'approved') {
      throw new ExtensionError(
        'trust_required',
        'Approve trusted execution before enabling an extension that ships migrations.',
        422
      );
    }

    try {
      const ran = await applyMigrations(record, services);
      await applyHost(record, services);
      const saved = await services.repo.upsert({
        ...record,
        status: 'enabled',
        health: 'healthy',
        lastError: undefined,
        enabledAt: new Date().toISOString(),
        migrationStatus: record.manifest.migrations ? 'applied' : record.migrationStatus,
        migrationError: undefined,
        history: withHistory(record.history, {
          action: 'enable',
          fromStatus: record.status,
          toStatus: 'enabled',
          version: record.version,
          message:
            ran.length > 0
              ? `Enabled. Migrations applied: ${ran.join(', ')}.`
              : record.manifest.entry?.backend && record.trustedExecution !== 'approved'
                ? 'Enabled static contributions. Backend code was not executed because trust is still pending.'
                : 'Extension enabled.',
          actorId: services.actorId,
        }),
      });
      logExtension('info', 'enable.succeeded', { extensionId, version: record.version });
      return saved;
    } catch (error) {
      await detachHost(record);
      const message = safeErrorMessage(error);
      await services.repo.upsert({
        ...record,
        health: 'error',
        lastError: message,
        migrationStatus:
          error instanceof ExtensionError && error.code === 'migration_failed' ? 'failed' : record.migrationStatus,
        migrationError:
          error instanceof ExtensionError && error.code === 'migration_failed' ? message : record.migrationError,
        history: withHistory(record.history, {
          action: 'enable_failed',
          fromStatus: record.status,
          toStatus: record.status,
          version: record.version,
          message,
          actorId: services.actorId,
        }),
      });
      logExtension('error', 'enable.failed', { extensionId, message });
      throw error;
    }
  });
}

export async function disableExtension(extensionId: string, services: ExtensionServices) {
  return withExtensionLock(services, extensionId, async () => {
    const record = await requireExtension(services, extensionId);
    if (record.status === 'disabled' || record.status === 'installed' || record.status === 'failed') {
      return record;
    }
    if (record.status !== 'enabled') {
      throw new ExtensionError('invalid_state', `Cannot disable an extension that is ${record.status}.`, 409);
    }
    const blockers = enabledDependents(extensionId, await services.repo.list());
    if (blockers.length > 0) {
      throw new ExtensionError(
        'dependency_in_use',
        `Disable dependent extensions first: ${blockers.map((item) => item.extensionId).join(', ')}.`,
        409
      );
    }
    await detachHost(record);
    const saved = await services.repo.upsert({
      ...record,
      status: 'disabled',
      health: 'unknown',
      history: withHistory(record.history, {
        action: 'disable',
        fromStatus: 'enabled',
        toStatus: 'disabled',
        version: record.version,
        message: 'Extension disabled. Stored data was kept.',
        actorId: services.actorId,
      }),
    });
    logExtension('info', 'disable.succeeded', { extensionId });
    return saved;
  });
}

export async function uninstallExtension(
  extensionId: string,
  services: ExtensionServices,
  options: { confirmDeleteData?: boolean } = {}
) {
  return withExtensionLock(services, extensionId, async () => {
    const record = await services.repo.findByExtensionId(extensionId);
    if (!record || record.status === 'uninstalled') {
      throw new ExtensionError('not_found', 'Extension was not found.', 404);
    }
    const dependents = dependentsOf(extensionId, await services.repo.list());
    if (dependents.length > 0) {
      throw new ExtensionError(
        'dependency_in_use',
        `Remove dependent extensions first: ${dependents.map((item) => item.extensionId).join(', ')}.`,
        409
      );
    }
    if (record.status === 'enabled') await detachHost(record);
    await services.storage.removeExtension(extensionId);
    if (options.confirmDeleteData) await services.migrations.clear(extensionId);
    const saved = await services.repo.upsert({
      ...record,
      status: 'uninstalled',
      health: 'unknown',
      storageRef: '',
      lastError: undefined,
      history: withHistory(record.history, {
        action: 'uninstall',
        fromStatus: record.status,
        toStatus: 'uninstalled',
        version: record.version,
        message: options.confirmDeleteData
          ? 'Extension code removed. Migration history cleared. User tables were not dropped.'
          : 'Extension code removed. Migration history and user data were kept.',
        actorId: services.actorId,
      }),
    });
    logExtension('info', 'uninstall.succeeded', {
      extensionId,
      deleteData: Boolean(options.confirmDeleteData),
    });
    return saved;
  });
}

export async function updateExtension(extensionId: string, bytes: Buffer, services: ExtensionServices) {
  return withExtensionLock(services, extensionId, async () => {
    const existing = await requireExtension(services, extensionId);
    const validation = await validateExtensionPackage(
      bytes,
      validationContext(services, 'update', {
        expectedExtensionId: extensionId,
        approvedPermissions: existing.approvedPermissions,
      })
    );
    if (!validation.installable || !validation.manifest) {
      throw validationToError(validation.status, validation.errors, 'Update package is not valid.');
    }
    const manifest = validation.manifest;
    if (manifest.id !== extensionId) {
      throw new ExtensionError('forged_extension_id', 'The package id does not match this extension.', 400);
    }
    const inspected = await inspectExtensionArchive(bytes, services.limits);
    if (!inspected.ok) {
      throw validationToError('invalid_package', inspected.errors, 'Update package failed inspection.');
    }

    let wrote = false;
    try {
      const compiled = compileExtensionEntries(inspected.entries, manifest);
      const storageRef = await services.storage.writeVersion(
        extensionId,
        compiled.manifest.version,
        compiled.entries,
        bytes
      );
      wrote = true;
      await services.beforeCommit?.();
      const codeChanged = existing.checksum !== validation.checksum;
      const approvedPermissions = existing.approvedPermissions.filter((permission) =>
        compiled.manifest.permissions.includes(permission)
      );
      const pendingPermissions = compiled.manifest.permissions.filter(
        (permission) => !approvedPermissions.includes(permission)
      );
      let status: ExtensionStatus = existing.status;
      if (existing.status === 'enabled' && (codeChanged || pendingPermissions.length > 0)) {
        await detachHost(existing);
        status = 'disabled';
      }
      await services.storage.writeCurrent(extensionId, compiled.manifest.version);
      const saved = await services.repo.upsert({
        ...existing,
        name: compiled.manifest.name,
        description: compiled.manifest.description,
        version: compiled.manifest.version,
        publisher: compiled.manifest.publisher,
        manifest: compiled.manifest,
        checksum: validation.checksum,
        storageRef,
        status,
        sdkCompatibility: compiled.manifest.compatibility.extensionSdk,
        dependencies: compiled.manifest.dependencies,
        requestedPermissions: compiled.manifest.permissions,
        approvedPermissions,
        trustedExecution: codeChanged ? 'pending' : existing.trustedExecution,
        trustedExecutionBy: codeChanged ? undefined : existing.trustedExecutionBy,
        trustedExecutionAt: codeChanged ? undefined : existing.trustedExecutionAt,
        previousVersion: existing.version,
        previousChecksum: existing.checksum,
        health: status === 'enabled' ? 'healthy' : 'unknown',
        lastError: undefined,
        migrationStatus: compiled.manifest.migrations ? 'pending' : 'none',
        history: withHistory(existing.history, {
          action: 'update',
          fromStatus: existing.status,
          toStatus: status,
          version: compiled.manifest.version,
          message: codeChanged
            ? 'Update stored. Trust was cleared and the extension was not left running new code. Previous files were kept for rollback.'
            : 'Update promoted. Previous version files were kept for rollback.',
          actorId: services.actorId,
        }),
      });
      logExtension('info', 'update.succeeded', {
        extensionId,
        version: compiled.manifest.version,
        status,
        compiled: compiled.compiled,
      });
      return { extension: saved, validation: { ...validation, manifest: compiled.manifest } };
    } catch (error) {
      if (wrote) await services.storage.removeVersion(extensionId, validation.manifest.version).catch(() => undefined);
      await services.storage.writeCurrent(extensionId, existing.version).catch(() => undefined);
      if (existing.status === 'enabled') await applyHost(existing, services).catch(() => undefined);
      const message = safeErrorMessage(error);
      await services.repo.upsert({
        ...existing,
        health: 'error',
        lastError: message,
        history: withHistory(existing.history, {
          action: 'update_failed',
          fromStatus: existing.status,
          toStatus: existing.status,
          version: existing.version,
          message: `${message} Previous version remains active. Migrations were not reversed.`,
          actorId: services.actorId,
        }),
      });
      logExtension('error', 'update.failed', { extensionId, message });
      throw error;
    }
  });
}

export async function rollbackExtension(extensionId: string, services: ExtensionServices) {
  return withExtensionLock(services, extensionId, async () => {
    const record = await requireExtension(services, extensionId);
    if (!record.previousVersion || !record.previousChecksum) {
      throw new ExtensionError('invalid_state', 'There is no previous version to restore.', 409);
    }
    const { extensionManifestSchema } = await import('@/lib/extensions/schema');
    const parsed = extensionManifestSchema.safeParse(
      await services.storage.readManifest(extensionId, record.previousVersion)
    );
    if (!parsed.success) {
      throw new ExtensionError('invalid_package', 'The previous package manifest can no longer be read.', 422);
    }
    const restored: StoredExtension = {
      ...record,
      name: parsed.data.name,
      description: parsed.data.description,
      version: record.previousVersion,
      checksum: record.previousChecksum,
      manifest: parsed.data,
      storageRef: `${extensionId}/versions/${record.previousVersion}`,
      sdkCompatibility: parsed.data.compatibility.extensionSdk,
      dependencies: parsed.data.dependencies,
      requestedPermissions: parsed.data.permissions,
      approvedPermissions: record.approvedPermissions.filter((permission) =>
        parsed.data.permissions.includes(permission)
      ),
      trustedExecution: 'pending',
      previousVersion: undefined,
      previousChecksum: undefined,
    };
    if (record.status === 'enabled') {
      await detachHost(record);
      restored.status = 'disabled';
    }
    await services.storage.writeCurrent(extensionId, restored.version);
    const saved = await services.repo.upsert({
      ...restored,
      health: 'unknown',
      lastError: undefined,
      history: withHistory(record.history, {
        action: 'rollback',
        fromStatus: record.status,
        toStatus: restored.status,
        version: restored.version,
        message: `Restored ${restored.version}. Newer migrations were not reversed. Approve trust again before enabling.`,
        actorId: services.actorId,
      }),
    });
    logExtension('warn', 'rollback.succeeded', { extensionId, version: restored.version });
    return saved;
  });
}

export async function approveExtensionPermissions(
  extensionId: string,
  input: { approve: string[]; trustedExecution?: 'approved' | 'denied' },
  services: ExtensionServices
) {
  return withExtensionLock(services, extensionId, async () => {
    const record = await requireExtension(services, extensionId);
    const unknown = input.approve.filter((permission) => !record.requestedPermissions.includes(permission));
    if (unknown.length > 0) {
      throw new ExtensionError(
        'permission_escalation',
        `Cannot approve permissions that were not requested: ${unknown.join(', ')}.`,
        400
      );
    }
    const trustedExecution = input.trustedExecution ?? record.trustedExecution;
    const saved = await services.repo.upsert({
      ...record,
      approvedPermissions: [...input.approve],
      trustedExecution,
      trustedExecutionBy: input.trustedExecution ? services.actorId : record.trustedExecutionBy,
      trustedExecutionAt: input.trustedExecution ? new Date().toISOString() : record.trustedExecutionAt,
      history: withHistory(record.history, {
        action: 'permissions',
        fromStatus: record.status,
        toStatus: record.status,
        version: record.version,
        message: `Approved permissions: ${input.approve.join(', ') || '(none)'}. Trust: ${trustedExecution}.`,
        actorId: services.actorId,
      }),
    });
    logExtension('info', 'permissions.updated', {
      extensionId,
      trustedExecution,
      actorId: services.actorId,
    });
    return saved;
  });
}

export async function listExtensions(services: ExtensionServices) {
  return services.repo.list();
}

export async function getExtension(extensionId: string, services: ExtensionServices) {
  return requireExtension(services, extensionId);
}

export async function describeCompatibility(extensionId: string, services: ExtensionServices) {
  const record = await requireExtension(services, extensionId);
  const [target, installed] = await Promise.all([
    services.resolveTarget(record.targetPluginId),
    services.repo.list(),
  ]);
  return {
    extensionId,
    targetIssues: assessTarget(record.manifest, target),
    dependencyIssues: assessDependencies(record.manifest, installed, { requireEnabled: true }),
    dependents: dependentsOf(extensionId, installed).map((item) => ({
      extensionId: item.extensionId,
      status: item.status,
      version: item.version,
    })),
    trustedExecution: record.trustedExecution,
  };
}

export async function describeHealth(extensionId: string, services: ExtensionServices) {
  const record = await requireExtension(services, extensionId);
  return {
    extensionId,
    status: record.status,
    health: record.health,
    lastError: record.lastError ?? null,
    migrationStatus: record.migrationStatus,
    migrationError: record.migrationError ?? null,
    migrations: await services.migrations.list(extensionId),
    hostRegistered: Boolean(getExtensionHost(record.targetPluginId)),
    trustedExecution: record.trustedExecution,
  };
}

export async function reattachEnabledExtensions(pluginId: string, services?: ExtensionServices) {
  const resolved = services ?? (await createDefaultExtensionServices());
  const enabled = await resolved.repo.list({ targetPluginId: pluginId, status: 'enabled' });
  for (const extension of enabled) {
    try {
      await applyHost(extension, resolved);
      await resolved.repo.upsert({ ...extension, health: 'healthy', lastError: undefined });
    } catch (error) {
      const message = safeErrorMessage(error);
      await resolved.repo.upsert({ ...extension, health: 'degraded', lastError: message });
      logExtension('error', 'reattach.failed', { extensionId: extension.extensionId, message });
    }
  }
}

export async function markTargetExtensionsDegraded(pluginId: string, services?: ExtensionServices) {
  const resolved = services ?? (await createDefaultExtensionServices());
  const enabled = await resolved.repo.list({ targetPluginId: pluginId, status: 'enabled' });
  for (const extension of enabled) {
    forgetRegistration(extension.extensionId);
    await resolved.repo.upsert({
      ...extension,
      health: 'degraded',
      lastError: 'Target plugin extension host was unloaded.',
    });
  }
}

export async function createDefaultExtensionServices(actorId?: string): Promise<ExtensionServices> {
  const { getUserDbConnection, getPluginModel } = await import('@/utils/db');
  const { getMaxPluginFiles, getMaxPluginZipBytes } = await import('@/lib/plugins/uploadLimits');
  const { MAX_PLUGIN_ZIP_BYTES, MAX_PLUGIN_FILES } = await import('@/lib/plugins/storage');
  const { MAX_EXTENSION_EXTRACTED_BYTES, MAX_EXTENSION_FILE_BYTES, getCmsVersion } = await import(
    '@/lib/extensions/constants'
  );
  const { createMongoExtensionRepository, createMongoMigrationRepository } = await import(
    '@/lib/extensions/repository'
  );
  const { getDefaultExtensionStorage } = await import('@/lib/extensions/storage');
  await getUserDbConnection();
  let maxFiles = MAX_PLUGIN_FILES;
  let maxZipBytes = MAX_PLUGIN_ZIP_BYTES;
  try {
    maxFiles = await getMaxPluginFiles();
  } catch {
    maxFiles = MAX_PLUGIN_FILES;
  }
  try {
    maxZipBytes = await getMaxPluginZipBytes();
  } catch {
    maxZipBytes = MAX_PLUGIN_ZIP_BYTES;
  }
  return {
    repo: createMongoExtensionRepository(),
    migrations: createMongoMigrationRepository(),
    storage: getDefaultExtensionStorage(),
    limits: {
      maxZipBytes,
      maxFiles,
      maxExtractedBytes: MAX_EXTENSION_EXTRACTED_BYTES,
      maxFileBytes: MAX_EXTENSION_FILE_BYTES,
    },
    cmsVersion: getCmsVersion(),
    actorId,
    resolveTarget: async (pluginId: string) => {
      const plugin = await getPluginModel().findOne({ pluginId }).lean();
      if (!plugin) return null;
      const host = getExtensionHost(pluginId);
      return {
        pluginId,
        version: String(plugin.version || '0.0.0'),
        isActive: Boolean(plugin.isActive),
        host: host ? { sdkVersion: host.sdkVersion, capabilities: [...host.capabilities] } : null,
      };
    },
  };
}
