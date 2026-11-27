import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCapability, getCapabilitiesForRole } from '@/lib/rbac/capabilities';
import { ROLE } from '@/lib/rbac/roles';
import { resolvePluginPermissionsForRole } from '@/lib/rbac/pluginPermissions';

test('Admin has full CMS capabilities', () => {
  assert.ok(hasCapability(ROLE.ADMIN, 'users.manage'));
  assert.ok(hasCapability(ROLE.ADMIN, 'plugins.manage'));
  assert.ok(hasCapability(ROLE.ADMIN, 'settings.manage'));
});

test('Editor can manage content but not users or settings', () => {
  assert.ok(hasCapability(ROLE.EDITOR, 'pages.create'));
  assert.ok(hasCapability(ROLE.EDITOR, 'blogs.publish'));
  assert.ok(hasCapability(ROLE.EDITOR, 'plugins.use'));
  assert.equal(hasCapability(ROLE.EDITOR, 'users.manage'), false);
  assert.equal(hasCapability(ROLE.EDITOR, 'settings.manage'), false);
});

test('Author can work on own content only', () => {
  assert.ok(hasCapability(ROLE.AUTHOR, 'pages.create'));
  assert.ok(hasCapability(ROLE.AUTHOR, 'blogs.create'));
  assert.ok(hasCapability(ROLE.AUTHOR, 'blogs.edit.own'));
  assert.equal(hasCapability(ROLE.AUTHOR, 'blogs.publish'), false);
  assert.equal(hasCapability(ROLE.AUTHOR, 'pages.edit.all'), false);
  assert.equal(hasCapability(ROLE.AUTHOR, 'users.manage'), false);
});

test('Editor receives plugin permissions except configure', () => {
  const perms = resolvePluginPermissionsForRole(
    ['email.read', 'email.send', 'email.configure', 's3.read'],
    ROLE.EDITOR
  );
  assert.deepEqual(perms.sort(), ['email.read', 'email.send', 's3.read'].sort());
});

test('Author receives no plugin permissions', () => {
  const perms = resolvePluginPermissionsForRole(['email.send'], ROLE.AUTHOR);
  assert.equal(perms.length, 0);
});

test('unknown role defaults to author capabilities', () => {
  const caps = getCapabilitiesForRole(99);
  assert.ok(caps.includes('blogs.create'));
  assert.equal(hasCapability(99, 'users.manage'), false);
});
