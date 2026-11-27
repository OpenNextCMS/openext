import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ExtensionError } from '@/lib/extensions/errors';
import { approveExtensionPermissions, enableExtension, installStagedExtension, uploadExtensionPackage } from '@/lib/extensions/lifecycle';
import { createExtensionContext } from '@/lib/extensions/trustedRuntime';
import { createMemoryExtensionRepository } from '@/lib/extensions/repository';
import { baseManifest, cleanup, makeServices, packageFiles, tempDir, zipOf } from '@/lib/extensions/__tests__/helpers';

test('permission approval cannot grant undeclared permissions', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const uploaded = await uploadExtensionPackage(
      await zipOf(packageFiles(baseManifest({ permissions: ['notes.read'] }))),
      services
    );
    await installStagedExtension(uploaded.stagingId!, services);
    await assert.rejects(
      () => approveExtensionPermissions('sample-notes', { approve: ['notes.read', 'notes.admin'] }, services),
      (error: unknown) => error instanceof ExtensionError && error.code === 'permission_escalation'
    );
  } finally {
    await cleanup(root);
  }
});

test('enable does not execute the backend until trust is approved', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    let executed = false;
    services.executeBackend = async () => {
      executed = true;
      throw new Error('backend should not run');
    };
    const uploaded = await uploadExtensionPackage(
      await zipOf(
        packageFiles(baseManifest({ entry: { frontend: 'ui/pages/index.html', backend: 'server/index.js' } }), {
          'server/index.js': 'throw new Error("executed")',
        })
      ),
      services
    );
    await installStagedExtension(uploaded.stagingId!, services);
    const enabled = await enableExtension('sample-notes', services);
    assert.equal(enabled.status, 'enabled');
    assert.equal(executed, false);
    assert.match(enabled.history.at(-1)?.message || '', /not executed/);
  } finally {
    await cleanup(root);
  }
});

test('extension context cannot approve permissions or read the environment', async () => {
  const context = createExtensionContext({
    registration: {
      extensionId: 'sample-notes',
      version: '1.0.0',
      targetPluginId: 'sample-host',
      capabilities: ['navigation.register'],
      permissions: [],
      contributions: {},
    },
    approvedPermissions: ['notes.read'],
  });
  const keys = Object.keys(context);
  assert.equal(keys.includes('approve'), false);
  assert.equal('env' in context, false);
  assert.equal('database' in context, false);
  assert.equal(context.permissions.has('notes.read'), true);
  assert.equal(context.permissions.has('notes.admin'), false);
  assert.throws(() => context.workflows.register({ id: 'x', label: 'X' }), /not allowed/);
});

test('repositories do not share rows, and storage rejects paths outside the root', async () => {
  const left = createMemoryExtensionRepository();
  const right = createMemoryExtensionRepository();
  await left.insertNew({
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
  assert.equal(await right.findByExtensionId('sample-notes'), null);

  const root = await tempDir();
  try {
    const services = makeServices(root);
    assert.throws(
      () => services.storage.resolvePublicFile('sample-notes', '1.0.0', '../package.json'),
      (error: unknown) => error instanceof ExtensionError
    );
    const outside = path.join(root, '..', 'escaped.txt');
    await fs.writeFile(path.join(root, 'marker.txt'), 'ok');
    assert.equal(await fs.access(outside).then(() => true, () => false), false);
  } finally {
    await cleanup(root);
  }
});

test('malicious archive paths do not become installable', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const uploaded = await uploadExtensionPackage(
      await zipOf({
        'manifest.json': JSON.stringify(baseManifest()),
        'ui/pages/index.html': '<p></p>',
        'server/../../outside.js': 'module.exports = {}',
      }),
      services
    );
    assert.equal(uploaded.stagingId, null);
    assert.equal(uploaded.validation.installable, false);
  } finally {
    await cleanup(root);
  }
});
