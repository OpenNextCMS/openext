import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPluginMountContext,
  resolveExtensionMountModuleUrl,
  resolvePluginMountModuleUrl,
} from '@/lib/plugins/mountRuntime';
import { isAdminMountPath, parsePluginManifest, resolvePluginKind } from '@/lib/plugins/manifest';

test('resolveAdminMountModule ignores legacy HTML adminNav entries', async () => {
  const { resolveAdminMountModule, isMountModulePath } = await import('@/lib/plugins/adminNav');
  assert.equal(isMountModulePath('/plugins/email-plugin/ui/admin/mount.js'), true);
  assert.equal(isMountModulePath('/plugins/email-plugin/ui/admin/index.html'), false);
  assert.equal(
    resolveAdminMountModule(
      '/plugins/email-plugin/ui/admin/mount.js',
      [
        { id: 'send', label: 'Send Email', entry: '/plugins/email-plugin/ui/admin/index.html' },
        { id: 'logs', label: 'Logs', entry: '/plugins/email-plugin/ui/admin/mount.js' },
      ],
      'send'
    ),
    '/plugins/email-plugin/ui/admin/mount.js'
  );
  assert.equal(
    resolveAdminMountModule(
      '/plugins/email-plugin/ui/admin/mount.js',
      [{ id: 'logs', label: 'Logs', entry: '/plugins/email-plugin/ui/admin/mount.js' }],
      'logs'
    ),
    '/plugins/email-plugin/ui/admin/mount.js'
  );
});

test('rewriteCssUrls resolves relative urls against the stylesheet href', async () => {
  const { rewriteCssUrls } = await import('@/lib/plugins/mountRuntime');
  const css = '.x { background: url(./bg.png); } .y { background: url("/abs.png"); }';
  const out = rewriteCssUrls(css, 'http://localhost/plugins/email-plugin/ui/admin/styles.css');
  assert.match(out, /url\(http:\/\/localhost\/plugins\/email-plugin\/ui\/admin\/bg\.png\)/);
  assert.match(out, /url\("\/abs\.png"\)/);
});

test('resolvePluginMountModuleUrl accepts public and relative paths', () => {
  assert.equal(
    resolvePluginMountModuleUrl('openext-crm-suite', '/plugins/openext-crm-suite/ui/admin/mount.js'),
    '/plugins/openext-crm-suite/ui/admin/mount.js'
  );
  assert.equal(
    resolvePluginMountModuleUrl('openext-crm-suite', 'ui/admin/mount.js'),
    '/plugins/openext-crm-suite/ui/admin/mount.js'
  );
});

test('resolveExtensionMountModuleUrl encodes segments', () => {
  assert.equal(
    resolveExtensionMountModuleUrl('crm-travel', 'ui/pages/travel.js'),
    '/extensions/crm-travel/ui/pages/travel.js'
  );
});

test('buildPluginMountContext sets asset and api bases', () => {
  const ctx = buildPluginMountContext({
    pluginId: 'openext-crm-suite',
    pageId: 'leads',
    roleId: 'admin',
    features: ['crm.leads.write'],
  });
  assert.equal(ctx.assetBase, '/plugins/openext-crm-suite/');
  assert.equal(ctx.apiBase, '/api/plugins/openext-crm-suite/');
  assert.equal(ctx.pageId, 'leads');
  assert.deepEqual(ctx.features, ['crm.leads.write']);
});

test('system plugins require adminMount, not adminEntry HTML', () => {
  assert.equal(isAdminMountPath('ui/admin/mount.js'), true);
  assert.equal(isAdminMountPath('ui/admin/index.html'), false);

  const withMount = parsePluginManifest({
    id: 'demo-crm',
    name: 'Demo CRM',
    version: '1.0.0',
    kind: 'system',
    adminMount: 'ui/admin/mount.js',
  });
  const resolved = resolvePluginKind(withMount, ['ui/admin/mount.js']);
  assert.equal(resolved.adminMount, 'ui/admin/mount.js');

  const htmlOnly = parsePluginManifest({
    id: 'legacy-crm',
    name: 'Legacy CRM',
    version: '1.0.0',
    kind: 'system',
    adminEntry: 'ui/admin/index.html',
  });
  assert.throws(
    () => resolvePluginKind(htmlOnly, ['ui/admin/index.html']),
    /adminMount/
  );
});
