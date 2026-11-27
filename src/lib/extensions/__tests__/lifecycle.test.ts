import test from 'node:test';
import assert from 'node:assert/strict';
import { ExtensionError } from '@/lib/extensions/errors';
import {
  disableExtension,
  enableExtension,
  installStagedExtension,
  rollbackExtension,
  uninstallExtension,
  updateExtension,
  uploadExtensionPackage,
} from '@/lib/extensions/lifecycle';
import { baseManifest, cleanup, makeServices, packageFiles, tempDir, zipOf } from '@/lib/extensions/__tests__/helpers';

async function installPackage(root: string, manifest: unknown = baseManifest()) {
  const services = makeServices(root);
  const uploaded = await uploadExtensionPackage(await zipOf(packageFiles(manifest)), services);
  assert.ok(uploaded.stagingId);
  const installed = await installStagedExtension(uploaded.stagingId, services);
  return { services, installed };
}

test('installs a valid package as installed and cleans up when commit fails', async () => {
  const root = await tempDir();
  try {
    const { services, installed } = await installPackage(root);
    assert.equal(installed.extension.status, 'installed');
    assert.equal(installed.extension.extensionId, 'sample-notes');
    assert.equal(services.seen.length, 0);

    const failing = makeServices(await tempDir());
    failing.beforeCommit = async () => {
      throw new Error('disk full');
    };
    const uploaded = await uploadExtensionPackage(await zipOf(packageFiles()), failing);
    await assert.rejects(() => installStagedExtension(uploaded.stagingId!, failing), /disk full/);
    assert.equal(await failing.repo.findByExtensionId('sample-notes'), null);
    await cleanup(failing.storage ? root : root);
  } finally {
    await cleanup(root);
  }
});

test('enable, disable, duplicate enable, and permission gate', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const uploaded = await uploadExtensionPackage(
      await zipOf(packageFiles(baseManifest({ permissions: ['notes.read'] }))),
      services
    );
    const installed = await installStagedExtension(uploaded.stagingId!, services);
    await assert.rejects(
      () => enableExtension(installed.extension.extensionId, services),
      (error: unknown) => error instanceof ExtensionError && error.code === 'permission_approval_required'
    );
    const approved = await services.repo.findByExtensionId('sample-notes');
    await services.repo.upsert({ ...approved!, approvedPermissions: ['notes.read'] });
    const enabled = await enableExtension('sample-notes', services);
    assert.equal(enabled.status, 'enabled');
    assert.equal(services.seen.length, 1);
    const again = await enableExtension('sample-notes', services);
    assert.equal(again.status, 'enabled');
    const disabled = await disableExtension('sample-notes', services);
    assert.equal(disabled.status, 'disabled');
    const disabledAgain = await disableExtension('sample-notes', services);
    assert.equal(disabledAgain.status, 'disabled');
  } finally {
    await cleanup(root);
  }
});

test('update failure keeps the previous version and rollback restores it', async () => {
  const root = await tempDir();
  try {
    const { services } = await installPackage(root);
    await enableExtension('sample-notes', services);
    services.beforeCommit = async () => {
      throw new Error('update exploded');
    };
    await assert.rejects(
      async () => updateExtension('sample-notes', await zipOf(packageFiles(baseManifest({ version: '1.1.0' }))), services),
      /update exploded/
    );
    const current = await services.repo.findByExtensionId('sample-notes');
    assert.equal(current?.version, '1.0.0');
    assert.equal(current?.status, 'enabled');
    services.beforeCommit = undefined;
    const updated = await updateExtension(
      'sample-notes',
      await zipOf(packageFiles(baseManifest({ version: '1.1.0' }))),
      services
    );
    assert.equal(updated.extension.version, '1.1.0');
    assert.equal(updated.extension.status, 'disabled');
    const rolled = await rollbackExtension('sample-notes', services);
    assert.equal(rolled.version, '1.0.0');
    assert.equal(rolled.trustedExecution, 'pending');
  } finally {
    await cleanup(root);
  }
});

test('migration failure does not enable, and uninstall keeps migration history', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const manifest = baseManifest({
      migrations: 'migrations',
      capabilities: ['navigation.register', 'ui.page.register', 'migrations.register'],
    });
    const uploaded = await uploadExtensionPackage(
      await zipOf(packageFiles(manifest, { 'migrations/001_notes.js': 'module.exports = { up() {} }' })),
      services
    );
    await installStagedExtension(uploaded.stagingId!, services);
    await assert.rejects(() => enableExtension('sample-notes', services), (error: unknown) => {
      return error instanceof ExtensionError && error.code === 'trust_required';
    });
    const blocked = await services.repo.findByExtensionId('sample-notes');
    assert.equal(blocked?.status, 'installed');

    await services.repo.upsert({ ...blocked!, trustedExecution: 'approved' });
    services.runMigrations = async () => {
      throw new ExtensionError('migration_failed', 'Migration "001_notes" failed: boom', 422);
    };
    await assert.rejects(() => enableExtension('sample-notes', services), /boom/);
    assert.equal((await services.repo.findByExtensionId('sample-notes'))?.status, 'installed');

    services.runMigrations = async () => {
      await services.migrations.record('sample-notes', '001_notes', '1.0.0');
      return ['001_notes'];
    };
    const enabled = await enableExtension('sample-notes', services);
    assert.equal(enabled.status, 'enabled');
    await uninstallExtension('sample-notes', services);
    assert.equal((await services.migrations.list('sample-notes')).length, 1);
    await services.repo.upsert({
      ...(await services.repo.findByExtensionId('sample-notes'))!,
      status: 'installed',
    });
    const reinstallCheck = await services.repo.findByExtensionId('sample-notes');
    assert.equal(reinstallCheck?.status, 'installed');
    await uninstallExtension('sample-notes', services, { confirmDeleteData: true });
    assert.equal((await services.migrations.list('sample-notes')).length, 0);
  } finally {
    await cleanup(root);
  }
});

test('a second install while the first is in progress conflicts', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const uploaded = await uploadExtensionPackage(await zipOf(packageFiles()), services);
    let release: () => void = () => undefined;
    let entered: () => void = () => undefined;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    services.beforeCommit = async () => {
      entered();
      await gate;
    };
    const first = installStagedExtension(uploaded.stagingId!, services);
    await enteredPromise;
    await assert.rejects(
      () => installStagedExtension(uploaded.stagingId!, services),
      (error: unknown) => error instanceof ExtensionError && error.httpStatus === 409
    );
    release();
    const installed = await first;
    assert.equal(installed.extension.status, 'installed');
  } finally {
    await cleanup(root);
  }
});
