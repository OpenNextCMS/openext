import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { detectCycle, sdkRangesCompatible } from '@/lib/extensions/compatibility';
import { enableExtension, installStagedExtension, uploadExtensionPackage } from '@/lib/extensions/lifecycle';
import { assertCompletePluginPackage } from '@/lib/plugins/extract';
import { parsePluginManifest, resolvePluginKind } from '@/lib/plugins/manifest';
import { validateExtensionPackage } from '@/lib/extensions/validate';
import {
  attachPluginExtensionHost,
  clearExtensionHostsForTests,
} from '@/lib/extensions/hostRegistry';
import { baseManifest, cleanup, limits, makeServices, packageFiles, tempDir, zipOf } from '@/lib/extensions/__tests__/helpers';

test('dependency, version, cycle, and SDK mismatches are detected', async () => {
  const root = await tempDir();
  try {
    const services = makeServices(root);
    const manifest = baseManifest({
      dependencies: [{ id: 'billing-tools', version: '^2.0.0' }],
    });
    const missing = await validateExtensionPackage(await zipOf(packageFiles(manifest)), {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: services.resolveTarget,
      listExtensions: () => services.repo.list(),
    });
    assert.equal(missing.errors.some((error) => error.code === 'missing_dependency'), true);

    const version = makeServices(root, {
      targets: {
        'sample-host': {
          pluginId: 'sample-host',
          version: '2.0.0',
          isActive: true,
          host: { sdkVersion: '^1.0.0', capabilities: ['navigation.register', 'ui.page.register'] },
        },
      },
    });
    const mismatch = await validateExtensionPackage(await zipOf(packageFiles(baseManifest())), {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: version.resolveTarget,
      listExtensions: () => version.repo.list(),
    });
    assert.equal(mismatch.status, 'incompatible_target_version');

    const cycle = detectCycle('a', new Map([['a', ['b']], ['b', ['a']]]));
    assert.deepEqual(cycle, ['a', 'b', 'a']);
    assert.equal(sdkRangesCompatible('^1.0.0', '^1.0.0'), true);
    assert.equal(sdkRangesCompatible('^2.0.0', '^1.0.0'), false);

    const cms = await validateExtensionPackage(await zipOf(packageFiles(baseManifest({
      compatibility: { cms: '^9.0.0', extensionSdk: '^1.0.0' },
    }))), {
      limits,
      cmsVersion: '0.1.0',
      mode: 'install',
      resolveTarget: services.resolveTarget,
      listExtensions: () => services.repo.list(),
    });
    assert.equal(cms.errors.some((error) => error.code === 'unsupported_cms'), true);
  } finally {
    await cleanup(root);
  }
});

test('complete plugin manifests still parse, and extension packages are refused by the plugin installer', () => {
  const block = parsePluginManifest({
    id: 'testimonial-block',
    name: 'Testimonial Block',
    version: '1.0.0',
    kind: 'block',
    entryPoint: 'index.js',
  });
  const resolved = resolvePluginKind(block, ['index.js']);
  assert.equal(resolved.kind, 'block');
  assert.equal(resolved.entryPoint, 'index.js');

  const system = parsePluginManifest({
    id: 'crm-plugin',
    name: 'CRM',
    version: '1.0.0',
    kind: 'system',
    adminMount: 'ui/admin/mount.js',
  });
  assert.equal(resolvePluginKind(system, ['ui/admin/mount.js']).kind, 'system');
  assert.equal(resolvePluginKind(system, ['ui/admin/mount.js']).adminMount, 'ui/admin/mount.js');
  assert.doesNotThrow(() => assertCompletePluginPackage(system));
  assert.throws(
    () => assertCompletePluginPackage({ type: 'plugin-extension' }),
    /Dashboard → Extensions/
  );
});

test('a non-integrated plugin module does not become an extension host', async () => {
  clearExtensionHostsForTests();
  assert.equal(await attachPluginExtensionHost('crm-plugin', undefined), 'skipped');
  assert.equal(
    await attachPluginExtensionHost('crm-plugin', {
      pluginId: 'other-plugin',
      sdkVersion: '^1.0.0',
      capabilities: ['navigation.register'],
      registerExtension() {},
      unregisterExtension() {},
    }),
    'mismatch'
  );
  clearExtensionHostsForTests();
});

test('the sample extension is discovered by a compatible host without executing its backend', async () => {
  const root = await tempDir();
  try {
    const sampleDir = path.join(process.cwd(), 'examples', 'extensions', 'sample-notes');
    const files: Record<string, Buffer> = {};
    async function walk(current: string, prefix: string) {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const absolute = path.join(current, entry.name);
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) await walk(absolute, relative);
        else files[relative.replace(/\\/g, '/')] = await fs.readFile(absolute);
      }
    }
    await walk(sampleDir, '');
    const services = makeServices(root);
    let executed = false;
    services.executeBackend = async () => {
      executed = true;
    };
    const uploaded = await uploadExtensionPackage(await zipOf(files), services);
    assert.equal(uploaded.validation.installable, true);
    await installStagedExtension(uploaded.stagingId!, services);
    await approveRead(services);
    const enabled = await enableExtension('sample-notes', services);
    assert.equal(enabled.status, 'enabled');
    assert.equal(executed, false);
    assert.equal(services.seen[0]?.contributions?.navigation?.[0]?.id, 'notes');
    assert.equal(services.seen[0]?.targetPluginId, 'sample-host');
  } finally {
    await cleanup(root);
  }
});

async function approveRead(services: ReturnType<typeof makeServices>) {
  const record = await services.repo.findByExtensionId('sample-notes');
  await services.repo.upsert({ ...record!, approvedPermissions: ['notes.read'] });
}
