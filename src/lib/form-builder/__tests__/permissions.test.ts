import test from 'node:test';
import assert from 'node:assert/strict';
import { can } from '@/lib/form-builder/permissions';
import type { FormBuilderRole, FormAccessAction } from '@/lib/form-builder/permissions';

/** RBAC matrix tests — Owner/Admin write+lifecycle, Editor read-only, Viewer none. */

const READ: FormAccessAction[] = ['forms.view', 'forms.submissions.view', 'forms.analytics.view'];
const WRITE: FormAccessAction[] = ['forms.create', 'forms.edit', 'forms.delete', 'forms.publish'];
const LIFECYCLE: FormAccessAction[] = ['install', 'enable', 'disable', 'uninstall'];

test('Owner can do everything', () => {
  for (const a of [...READ, ...WRITE, ...LIFECYCLE]) assert.equal(can('Owner', a), true, a);
});

test('Admin can do everything', () => {
  for (const a of [...READ, ...WRITE, ...LIFECYCLE]) assert.equal(can('Admin', a), true, a);
});

test('Editor can read but not write or run lifecycle', () => {
  for (const a of READ) assert.equal(can('Editor', a), true, a);
  for (const a of [...WRITE, ...LIFECYCLE]) assert.equal(can('Editor', a), false, a);
});

test('Viewer can do nothing', () => {
  for (const a of [...READ, ...WRITE, ...LIFECYCLE]) assert.equal(can('Viewer', a), false, a);
});

test('unknown role behaves as no-access', () => {
  assert.equal(can('Nobody' as FormBuilderRole, 'forms.view'), false);
});
