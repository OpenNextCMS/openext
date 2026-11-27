import type {
  ExtensionHealth,
  ExtensionStatus,
  MigrationState,
  TrustState,
} from '@/lib/extensions/constants';
import type { ExtensionDiagnostic, ExtensionValidationStatus } from '@/lib/extensions/errors';
import type { ExtensionHostAdapter } from '@/lib/extensions/contracts';
import type { ExtensionManifest } from '@/lib/extensions/schema';

export interface ExtensionHistoryEntry {
  at: string;
  action: string;
  fromStatus?: ExtensionStatus;
  toStatus?: ExtensionStatus;
  version?: string;
  message?: string;
  actorId?: string;
}

export interface StoredExtension {
  extensionId: string;
  name: string;
  description: string;
  version: string;
  targetPluginId: string;
  publisher?: { name: string; url?: string };
  manifest: ExtensionManifest;
  checksum: string;
  storageRef: string;
  status: ExtensionStatus;
  sdkCompatibility: string;
  dependencies: Array<{ id: string; version: string }>;
  requestedPermissions: string[];
  approvedPermissions: string[];
  trustedExecution: TrustState;
  trustedExecutionBy?: string;
  trustedExecutionAt?: string;
  installedAt?: string;
  enabledAt?: string;
  lastError?: string;
  health: ExtensionHealth;
  history: ExtensionHistoryEntry[];
  previousVersion?: string;
  previousChecksum?: string;
  migrationStatus: MigrationState;
  migrationError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExtensionRepository {
  findByExtensionId(extensionId: string): Promise<StoredExtension | null>;
  list(filter?: { targetPluginId?: string; status?: ExtensionStatus }): Promise<StoredExtension[]>;
  /** Fails when the extension id already exists. */
  insertNew(record: StoredExtension): Promise<StoredExtension>;
  upsert(record: StoredExtension): Promise<StoredExtension>;
  tryLock(extensionId: string, owner: string, ttlMs: number): Promise<boolean>;
  unlock(extensionId: string, owner: string): Promise<void>;
}

export interface MigrationRecord {
  extensionId: string;
  migration: string;
  version: string;
  executedAt: string;
}

export interface MigrationRepository {
  has(extensionId: string, migration: string): Promise<boolean>;
  record(extensionId: string, migration: string, version: string): Promise<void>;
  list(extensionId: string): Promise<MigrationRecord[]>;
  /** Removes migration history only. Does not drop extension-owned user data. */
  clear(extensionId: string): Promise<void>;
}

export interface TargetPluginInfo {
  pluginId: string;
  version: string;
  isActive: boolean;
  host: Pick<ExtensionHostAdapter, 'sdkVersion' | 'capabilities'> | null;
}

export interface ExtensionLimits {
  maxZipBytes: number;
  maxFiles: number;
  maxExtractedBytes: number;
  maxFileBytes: number;
}

export interface ExtensionSecurityReport {
  zipValid: boolean;
  pathSafety: boolean;
  entryPoints: boolean;
  executableContent: boolean;
  checksum: string;
}

export interface ExtensionValidationResult {
  status: ExtensionValidationStatus;
  installable: boolean;
  enableable: boolean;
  errors: ExtensionDiagnostic[];
  warnings: ExtensionDiagnostic[];
  checksum: string;
  fileCount: number;
  extractedBytes: number;
  manifest: ExtensionManifest | null;
  security: ExtensionSecurityReport;
}

export interface ValidationContext {
  limits: ExtensionLimits;
  cmsVersion: string;
  mode: 'install' | 'update';
  /** When updating, the extension id that already owns the installation. */
  expectedExtensionId?: string;
  /** Permissions already approved for this extension, if any. */
  approvedPermissions?: string[];
  resolveTarget: (pluginId: string) => Promise<TargetPluginInfo | null>;
  listExtensions: () => Promise<StoredExtension[]>;
}
