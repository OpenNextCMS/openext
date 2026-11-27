import path from 'node:path';
import { ZodError } from 'zod';
import { SERVER_ENTRY_EXTENSIONS } from '@/lib/extensions/constants';
import {
  assessCms,
  assessDependencies,
  assessTarget,
} from '@/lib/extensions/compatibility';
import {
  primaryValidationStatus,
  type ExtensionDiagnostic,
  type ExtensionValidationStatus,
} from '@/lib/extensions/errors';
import {
  duplicateStrings,
  extensionManifestSchema,
  hasDangerousKeys,
  type ExtensionManifest,
} from '@/lib/extensions/schema';
import type { ExtensionValidationResult, ValidationContext } from '@/lib/extensions/types';
import { inspectExtensionArchive } from '@/lib/extensions/zipInspect';

function zodDiagnostics(error: ZodError): ExtensionDiagnostic[] {
  return error.issues.map((issue) => ({
    code: issue.message.toLowerCase().includes('manifest version') ? 'unsupported_manifest' : 'invalid_manifest',
    message:
      issue.code === 'invalid_literal' && issue.path[0] === 'manifestVersion'
        ? 'Unsupported extension manifest version. Expected manifestVersion 1.'
        : `${issue.path.join('.') || 'manifest'}: ${issue.message}`,
    path: issue.path.join('.') || 'manifest.json',
  }));
}

function hasPrefix(entries: Map<string, Buffer>, declared: string): boolean {
  if (entries.has(declared)) return true;
  const prefix = declared.endsWith('/') ? declared : `${declared}/`;
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function archiveIsPathSafe(errors: ExtensionDiagnostic[]): boolean {
  return !errors.some((error) =>
    ['unsafe_path', 'unsafe_symlink', 'blocked_path', 'conflicting_path', 'unsupported_file'].includes(error.code)
  );
}

function emptySecurity(checksum: string, zipValid: boolean, pathSafety: boolean): ExtensionValidationResult['security'] {
  return {
    zipValid,
    pathSafety,
    entryPoints: false,
    executableContent: pathSafety,
    checksum,
  };
}

function resultFrom(options: {
  statuses: ExtensionValidationStatus[];
  errors: ExtensionDiagnostic[];
  warnings: ExtensionDiagnostic[];
  checksum: string;
  fileCount: number;
  extractedBytes: number;
  manifest: ExtensionManifest | null;
  security: ExtensionValidationResult['security'];
  approvedPermissions: string[];
}): ExtensionValidationResult {
  let status = primaryValidationStatus(options.statuses);
  const requested = options.manifest?.permissions ?? [];
  const approved = new Set(options.approvedPermissions);
  const needsApproval = requested.some((permission) => !approved.has(permission));
  if (status === 'valid' && needsApproval) status = 'permission_approval_required';
  const installable = status === 'valid' || status === 'permission_approval_required';
  const enableable = status === 'valid';
  return {
    status,
    installable,
    enableable,
    errors: options.errors,
    warnings: options.warnings,
    checksum: options.checksum,
    fileCount: options.fileCount,
    extractedBytes: options.extractedBytes,
    manifest: options.manifest,
    security: options.security,
  };
}

function contributionIssues(manifest: ExtensionManifest, entries: Map<string, Buffer>): ExtensionDiagnostic[] {
  const issues: ExtensionDiagnostic[] = [];
  const capabilities = new Set(manifest.capabilities);
  const contributions = manifest.contributions;

  const requireCapability = (capability: ExtensionManifest['capabilities'][number], present: boolean, label: string) => {
    if (present && !capabilities.has(capability)) {
      issues.push({
        code: 'invalid_manifest',
        message: `${label} requires the "${capability}" capability.`,
        path: 'capabilities',
      });
    }
  };

  if (manifest.entry?.frontend) {
    if (!manifest.entry.frontend.startsWith('ui/') && !manifest.entry.frontend.startsWith('assets/')) {
      issues.push({
        code: 'invalid_entry',
        message: 'entry.frontend must be under ui/ or assets/.',
        path: 'entry.frontend',
      });
    } else if (!entries.has(manifest.entry.frontend)) {
      issues.push({
        code: 'missing_entry',
        message: `Frontend entry "${manifest.entry.frontend}" was not found in the package.`,
        path: 'entry.frontend',
      });
    }
  }

  if (manifest.entry?.flow) {
    const flow = manifest.entry.flow;
    const flowExt = path.posix.extname(flow).toLowerCase();
    if ((!flow.startsWith('ui/') && !flow.startsWith('assets/')) || flowExt !== '.json') {
      issues.push({
        code: 'invalid_entry',
        message: 'entry.flow must be a .json file under ui/ or assets/.',
        path: 'entry.flow',
      });
    } else if (!entries.has(flow)) {
      issues.push({
        code: 'missing_entry',
        message: `Flow entry "${flow}" was not found in the package.`,
        path: 'entry.flow',
      });
    }
  }

  if (manifest.entry?.backend) {
    const backend = manifest.entry.backend;
    const extension = path.posix.extname(backend).toLowerCase();
    if (!backend.startsWith('server/') || !SERVER_ENTRY_EXTENSIONS.has(extension)) {
      issues.push({
        code: 'invalid_entry',
        message:
          'entry.backend must be a server/*.js, server/*.cjs, server/*.mjs, server/*.ts, or server/*.tsx file.',
        path: 'entry.backend',
      });
    } else if (!entries.has(backend)) {
      issues.push({
        code: 'missing_entry',
        message: `Backend entry "${backend}" was not found in the package.`,
        path: 'entry.backend',
      });
    }
  } else if (
    [...entries.keys()].some(
      (filePath) =>
        filePath === 'server/index.js' ||
        filePath === 'server/index.cjs' ||
        filePath === 'server/index.mjs' ||
        filePath === 'server/index.ts' ||
        filePath === 'server/index.tsx'
    )
  ) {
    issues.push({
      code: 'backend_not_declared',
      message:
        'server/index.js (or .ts) is present but entry.backend is not set, so the CMS will not load it.',
    });
  }

  if (manifest.migrations) {
    if (!manifest.migrations.startsWith('migrations')) {
      issues.push({
        code: 'invalid_manifest',
        message: 'migrations must point at the migrations directory.',
        path: 'migrations',
      });
    } else if (!hasPrefix(entries, manifest.migrations)) {
      issues.push({
        code: 'missing_entry',
        message: `Migrations path "${manifest.migrations}" was not found in the package.`,
        path: 'migrations',
      });
    }
    requireCapability('migrations.register', true, 'migrations');
  }

  requireCapability('navigation.register', Boolean(contributions?.navigation?.length), 'Navigation contributions');
  requireCapability('ui.page.register', Boolean(contributions?.pages?.length), 'Page contributions');
  requireCapability('settings.register', Boolean(contributions?.settings?.length), 'Settings contributions');
  requireCapability('fields.register', Boolean(contributions?.fields?.length), 'Field contributions');
  requireCapability('workflows.register', Boolean(contributions?.workflows?.length), 'Workflow contributions');
  requireCapability('events.subscribe', Boolean(contributions?.events?.length), 'Event contributions');
  requireCapability('api.register', Boolean(contributions?.routes?.length), 'Route contributions');

  const ids = [
    ...(contributions?.navigation?.map((item) => `navigation:${item.id}`) ?? []),
    ...(contributions?.pages?.map((item) => `page:${item.id}`) ?? []),
    ...(contributions?.fields?.map((item) => `field:${item.id}`) ?? []),
    ...(contributions?.workflows?.map((item) => `workflow:${item.id}`) ?? []),
  ];
  for (const duplicate of duplicateStrings(ids)) {
    issues.push({ code: 'duplicate_id', message: `Duplicate contribution id "${duplicate}".` });
  }
  for (const duplicate of duplicateStrings(manifest.permissions)) {
    issues.push({ code: 'duplicate_id', message: `Duplicate permission "${duplicate}".`, path: 'permissions' });
  }
  for (const duplicate of duplicateStrings(manifest.capabilities)) {
    issues.push({ code: 'duplicate_id', message: `Duplicate capability "${duplicate}".`, path: 'capabilities' });
  }
  for (const duplicate of duplicateStrings(manifest.dependencies.map((dependency) => dependency.id))) {
    issues.push({ code: 'duplicate_id', message: `Duplicate dependency "${duplicate}".`, path: 'dependencies' });
  }

  const referenced = [
    ...(contributions?.navigation?.map((item) => item.href) ?? []),
    ...(contributions?.pages?.map((item) => item.entry) ?? []),
  ];
  for (const filePath of referenced) {
    if (!entries.has(filePath)) {
      issues.push({
        code: 'missing_entry',
        message: `Contribution path "${filePath}" was not found in the package.`,
        path: filePath,
      });
    }
  }

  return issues;
}

/**
 * Validates an extension archive without executing it and without writing it
 * into the plugin or extension install directories.
 */
export async function validateExtensionPackage(
  bytes: Buffer,
  context: ValidationContext
): Promise<ExtensionValidationResult> {
  const inspected = await inspectExtensionArchive(bytes, context.limits);
  if (!inspected.ok) {
    return resultFrom({
      statuses: ['invalid_package'],
      errors: inspected.errors,
      warnings: inspected.warnings,
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest: null,
      security: emptySecurity(inspected.checksum, inspected.errors.every((error) => error.code !== 'invalid_zip' && error.code !== 'empty_package'), archiveIsPathSafe(inspected.errors)),
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  const manifestBytes = inspected.entries.get('manifest.json');
  if (!manifestBytes) {
    return resultFrom({
      statuses: ['invalid_package'],
      errors: [{ code: 'missing_manifest', message: 'manifest.json was not found in the extension package.' }],
      warnings: [],
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest: null,
      security: { ...emptySecurity(inspected.checksum, true, true), entryPoints: false },
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    return resultFrom({
      statuses: ['invalid_package'],
      errors: [{ code: 'invalid_manifest', message: 'manifest.json contains invalid JSON.', path: 'manifest.json' }],
      warnings: [],
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest: null,
      security: emptySecurity(inspected.checksum, true, true),
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  if (hasDangerousKeys(parsedJson)) {
    return resultFrom({
      statuses: ['invalid_package'],
      errors: [{ code: 'invalid_manifest', message: 'manifest.json contains unsupported object keys.', path: 'manifest.json' }],
      warnings: [],
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest: null,
      security: emptySecurity(inspected.checksum, true, true),
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  const parsed = extensionManifestSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const errors = zodDiagnostics(parsed.error);
    const unsupportedType = parsed.error.issues.some((issue) => issue.path[0] === 'type');
    if (unsupportedType) {
      errors.unshift({
        code: 'invalid_manifest',
        message: 'This ZIP is not an extension package. type must be "plugin-extension". Complete plugins use Dashboard → Plugins.',
        path: 'type',
      });
    }
    return resultFrom({
      statuses: ['invalid_package'],
      errors,
      warnings: [],
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest: null,
      security: emptySecurity(inspected.checksum, true, true),
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  const manifest = parsed.data;
  const structural = contributionIssues(manifest, inspected.entries);
  const structuralErrors = structural.filter((issue) => issue.code !== 'backend_not_declared');
  const structuralWarnings = structural.filter((issue) => issue.code === 'backend_not_declared');
  if (structuralErrors.length > 0) {
    return resultFrom({
      statuses: ['invalid_package'],
      errors: structuralErrors,
      warnings: structuralWarnings,
      checksum: inspected.checksum,
      fileCount: inspected.fileCount,
      extractedBytes: inspected.extractedBytes,
      manifest,
      security: { ...emptySecurity(inspected.checksum, true, true), entryPoints: false },
      approvedPermissions: context.approvedPermissions ?? [],
    });
  }

  const statuses: ExtensionValidationStatus[] = [];
  const errors: ExtensionDiagnostic[] = [];
  const warnings: ExtensionDiagnostic[] = [...structuralWarnings];

  for (const cmsIssue of assessCms(manifest, context.cmsVersion)) {
    statuses.push(cmsIssue.status);
    errors.push(cmsIssue);
  }

  const target = await context.resolveTarget(manifest.target.pluginId);
  for (const targetIssue of assessTarget(manifest, target)) {
    statuses.push(targetIssue.status);
    errors.push(targetIssue);
  }

  const installed = await context.listExtensions();
  const existing = installed.find((extension) => extension.extensionId === manifest.id) ?? null;
  if (context.mode === 'update') {
    if (!context.expectedExtensionId || context.expectedExtensionId !== manifest.id) {
      statuses.push('invalid_package');
      errors.push({
        code: 'forged_extension_id',
        message: 'The package id does not match the extension being updated.',
      });
    } else if (existing && existing.version === manifest.version) {
      statuses.push('invalid_package');
      errors.push({
        code: 'version_not_newer',
        message: `Version ${manifest.version} is already installed. Increase the version to update.`,
      });
    }
  } else if (existing && existing.status !== 'uninstalled' && existing.status !== 'failed') {
    statuses.push('duplicate_installation');
    errors.push({
      code: 'duplicate_installation',
      message: `Extension "${manifest.id}" is already installed. Update it instead of installing again.`,
    });
  }

  for (const dependencyIssue of assessDependencies(manifest, installed, { requireEnabled: false })) {
    statuses.push(dependencyIssue.status);
    errors.push(dependencyIssue);
  }

  if (manifest.permissions.length > 0) {
    warnings.push({
      code: 'permission_approval_required',
      message: `Requested permissions require administrator approval before enable: ${manifest.permissions.join(', ')}.`,
    });
  }

  return resultFrom({
    statuses,
    errors,
    warnings,
    checksum: inspected.checksum,
    fileCount: inspected.fileCount,
    extractedBytes: inspected.extractedBytes,
    manifest,
    security: {
      zipValid: true,
      pathSafety: true,
      entryPoints: structuralErrors.every((issue) => issue.code !== 'missing_entry' && issue.code !== 'invalid_entry'),
      executableContent: true,
      checksum: inspected.checksum,
    },
    approvedPermissions: context.approvedPermissions ?? existing?.approvedPermissions ?? [],
  });
}
