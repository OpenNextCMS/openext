import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/response';
import { ExtensionError } from '@/lib/extensions/errors';
import type { StoredExtension } from '@/lib/extensions/types';

export function extensionErrorResponse(error: unknown): NextResponse {
  if (error instanceof ExtensionError) {
    return NextResponse.json(
      { message: error.message, code: error.code, errors: error.errors },
      { status: error.httpStatus }
    );
  }
  return handleApiError(error);
}

/** Registry fields an administrator may see. Omits lock internals and absolute paths. */
export function toPublicExtension(record: StoredExtension) {
  return {
    extensionId: record.extensionId,
    name: record.name,
    description: record.description,
    version: record.version,
    targetPluginId: record.targetPluginId,
    publisher: record.publisher ?? null,
    checksum: record.checksum,
    storageRef: record.storageRef,
    status: record.status,
    health: record.health,
    sdkCompatibility: record.sdkCompatibility,
    dependencies: record.dependencies,
    requestedPermissions: record.requestedPermissions,
    approvedPermissions: record.approvedPermissions,
    trustedExecution: record.trustedExecution,
    installedAt: record.installedAt ?? null,
    enabledAt: record.enabledAt ?? null,
    updatedAt: record.updatedAt ?? null,
    createdAt: record.createdAt ?? null,
    lastError: record.lastError ?? null,
    previousVersion: record.previousVersion ?? null,
    migrationStatus: record.migrationStatus,
    migrationError: record.migrationError ?? null,
    capabilities: record.manifest.capabilities,
    manifest: record.manifest,
    history: record.history,
  };
}
