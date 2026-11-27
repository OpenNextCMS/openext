import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExtensionPackage } from '@/lib/extensions/validate';
import { assertArchiveEntryName } from '@/lib/extensions/zipInspect';
import {
  baseManifest,
  cleanup,
  limits,
  makeServices,
  packageFiles,
  tempDir,
  zipOf,
} from '@/lib/extensions/__tests__/helpers';

test('valid extension ZIP is installable and reports permission approval when permissions are requested', async () => {
  const root = await tempDir();
  const services = makeServices(root);
  try {
    const bytes = await zipOf(packageFiles(baseManifest({ permissions: ['notes.read'] })));
    const result = await validateExtensionPackage(bytes, {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: services.resolveTarget,
      listExtensions: () => services.repo.list(),
    });
    assert.equal(result.status, 'permission_approval_required');
    assert.equal(result.installable, true);
    assert.equal(result.enableable, false);
    assert.equal(result.manifest?.id, 'sample-notes');
    assert.match(result.checksum, /^[a-f0-9]{64}$/);
  } finally {
    await cleanup(root);
  }
});

test('missing manifest, malformed manifest, and missing entry are invalid packages', async () => {
  const root = await tempDir();
  const services = makeServices(root);
  const context = {
    limits,
    cmsVersion: '0.1.0',
    mode: 'install' as const,
    resolveTarget: services.resolveTarget,
    listExtensions: () => services.repo.list(),
  };
  try {
    const missing = await validateExtensionPackage(await zipOf({ 'README.md': 'x' }), context);
    assert.equal(missing.status, 'invalid_package');
    assert.equal(missing.errors.some((error) => error.code === 'invalid_package' || error.message.includes('manifest.json')), true);

    const malformed = await validateExtensionPackage(
      await zipOf({ 'manifest.json': '{', 'ui/pages/index.html': '<p></p>' }),
      context
    );
    assert.equal(malformed.errors.some((error) => error.code === 'invalid_manifest'), true);

    const missingEntry = await validateExtensionPackage(
      await zipOf({
        'manifest.json': JSON.stringify(baseManifest()),
      }),
      context
    );
    assert.equal(missingEntry.errors.some((error) => error.code === 'missing_entry'), true);
  } finally {
    await cleanup(root);
  }
});

test('path traversal, absolute paths, oversized archives, and file-count limits are rejected', async () => {
  assert.match(assertArchiveEntryName('../evil.js') || '', /not a safe relative path/);
  assert.match(assertArchiveEntryName('/etc/passwd') || '', /Absolute path/);
  assert.match(assertArchiveEntryName('C:/Windows/system.ini') || '', /Absolute path/);

  const root = await tempDir();
  const services = makeServices(root);
  try {
    const traversal = await validateExtensionPackage(
      await zipOf({
        'manifest.json': JSON.stringify(baseManifest()),
        'ui/../../evil.js': 'alert(1)',
      }),
      {
        limits,
        cmsVersion: '0.1.0',
        mode: 'install',
        resolveTarget: services.resolveTarget,
        listExtensions: () => services.repo.list(),
      }
    );
    assert.equal(traversal.status, 'invalid_package');
    assert.equal(traversal.security.pathSafety, false);

    const oversized = await validateExtensionPackage(Buffer.alloc(100), {
      limits: { ...limits, maxZipBytes: 50 },
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: services.resolveTarget,
      listExtensions: () => services.repo.list(),
    });
    assert.equal(oversized.errors.some((error) => error.code === 'oversized_package'), true);

    const tooMany = await validateExtensionPackage(await zipOf(packageFiles()), {
      limits: { ...limits, maxFiles: 1 },
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: services.resolveTarget,
      listExtensions: () => services.repo.list(),
    });
    assert.equal(tooMany.errors.some((error) => error.code === 'file_count'), true);
  } finally {
    await cleanup(root);
  }
});

test('missing target, duplicate id, and unsupported SDK are distinct results', async () => {
  const root = await tempDir();
  try {
    const missingTarget = makeServices(root, { targets: { 'sample-host': null } });
    const missing = await validateExtensionPackage(await zipOf(packageFiles()), {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: missingTarget.resolveTarget,
      listExtensions: () => missingTarget.repo.list(),
    });
    assert.equal(missing.status, 'missing_target_plugin');
    assert.equal(missing.installable, false);

    const duplicateServices = makeServices(root);
    await duplicateServices.repo.insertNew({
      extensionId: 'sample-notes',
      name: 'Sample Notes',
      description: '',
      version: '1.0.0',
      targetPluginId: 'sample-host',
      manifest: baseManifest() as never,
      checksum: 'abc',
      storageRef: 'sample-notes/versions/1.0.0',
      status: 'installed',
      sdkCompatibility: '^1.0.0',
      dependencies: [],
      requestedPermissions: [],
      approvedPermissions: [],
      trustedExecution: 'pending',
      health: 'unknown',
      history: [],
      migrationStatus: 'none',
    });
    const duplicate = await validateExtensionPackage(await zipOf(packageFiles()), {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: duplicateServices.resolveTarget,
      listExtensions: () => duplicateServices.repo.list(),
    });
    assert.equal(duplicate.status, 'duplicate_installation');

    const unsupported = makeServices(root, {
      targets: {
        'sample-host': {
          pluginId: 'sample-host',
          version: '1.2.0',
          isActive: true,
          host: { sdkVersion: '^1.0.0', capabilities: ['navigation.register'] },
        },
      },
    });
    const sdk = await validateExtensionPackage(
      await zipOf(
        packageFiles(
          baseManifest({
            capabilities: ['navigation.register', 'ui.page.register', 'workflows.register'],
          })
        )
      ),
      {
        limits,
        cmsVersion: '0.1.0',
        mode: 'install',
        resolveTarget: unsupported.resolveTarget,
        listExtensions: () => unsupported.repo.list(),
      }
    );
    assert.equal(sdk.status, 'unsupported_sdk');
  } finally {
    await cleanup(root);
  }
});
