import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionAssetPath,
  extensionHostPages,
  extensionHostPagesFromList,
  extensionNavLinks,
  isMountModuleEntry,
  runtimeExtensionPagePath,
} from '@/lib/extensions/hostPages';

const enabled = {
  extensionId: 'crm-travel',
  targetPluginId: 'openext-crm-suite',
  status: 'enabled' as const,
  contributions: {
    navigation: [{ id: 'travel', label: 'Travel', href: 'ui/pages/travel.js' }],
    pages: [{ id: 'travel', title: 'Travel lead', entry: 'ui/pages/travel.js' }],
  },
};

test('enabled extension mount pages are listed for the target plugin', () => {
  const pages = extensionHostPages(enabled);
  assert.deepEqual(pages, [
    {
      extensionId: 'crm-travel',
      targetPluginId: 'openext-crm-suite',
      id: 'travel',
      label: 'Travel',
      entry: 'ui/pages/travel.js',
    },
  ]);
});

test('HTML-only extension pages are not listed for dashboard mount', () => {
  assert.deepEqual(
    extensionHostPages({
      ...enabled,
      contributions: {
        navigation: [{ id: 'travel', label: 'Travel', href: 'ui/pages/travel.html' }],
        pages: [{ id: 'travel', title: 'Travel', entry: 'ui/pages/travel.html' }],
      },
    }),
    []
  );
  assert.equal(isMountModuleEntry('ui/pages/travel.js'), true);
  assert.equal(isMountModuleEntry('ui/pages/travel.html'), false);
});

test('a missing or disabled extension contributes no pages', () => {
  assert.deepEqual(extensionHostPages({ ...enabled, status: 'installed' }), []);
  assert.deepEqual(extensionHostPages({ ...enabled, status: 'disabled' }), []);
  assert.deepEqual(extensionHostPagesFromList([{ ...enabled, status: 'disabled', pages: [] }]), []);
});

test('server files and unsafe paths are not public pages', () => {
  assert.deepEqual(
    extensionHostPages({
      ...enabled,
      contributions: {
        pages: [{ id: 'travel', title: 'Travel', entry: 'server/index.js' }],
      },
    }),
    []
  );
  assert.deepEqual(
    extensionHostPages({
      ...enabled,
      contributions: {
        pages: [{ id: 'travel', title: 'Travel', entry: '../secrets.js' }],
      },
    }),
    []
  );
});

test('sidebar and mount addresses stay on the plugin runtime and the extension asset', () => {
  const [page] = extensionHostPages(enabled);
  assert.equal(
    runtimeExtensionPagePath(page.targetPluginId, page.extensionId, page.id),
    '/dashboard/plugins/runtime/openext-crm-suite/ext/crm-travel/travel'
  );
  assert.equal(extensionAssetPath(page), '/extensions/crm-travel/ui/pages/travel.js');
  assert.deepEqual(extensionNavLinks('openext-crm-suite', [page]), [
    {
      label: 'Travel',
      path: '/dashboard/plugins/runtime/openext-crm-suite/ext/crm-travel/travel',
    },
  ]);
  assert.deepEqual(extensionNavLinks('other-plugin', [page]), []);
});
