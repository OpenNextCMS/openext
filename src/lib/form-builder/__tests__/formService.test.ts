import test from 'node:test';
import assert from 'node:assert/strict';
import { FormService } from '@/lib/form-builder/services/formService';
import { EmailService } from '@/lib/form-builder/services/emailService';
import { DEFAULT_FORM_SETTINGS, DEFAULT_FORM_ANALYTICS } from '@/lib/form-builder/constants';

/**
 * FormService surface + the pure helpers around it. CRUD/versioning/duplication
 * that hit Mongo are integration tests (require a live page DB); here we assert
 * the service contract and the deterministic template/defaults logic.
 */

test('FormService exposes the full CRUD + versioning API', () => {
  const methods = [
    'createForm', 'getForms', 'getFormById', 'getFormBySlug', 'updateForm',
    'deleteForm', 'publishForm', 'archiveForm', 'duplicateForm',
    'createVersion', 'getVersions', 'restoreVersion',
  ];
  for (const m of methods) {
    assert.equal(typeof (FormService as Record<string, unknown>)[m], 'function', m);
  }
});

test('default settings/analytics have the expected shape', () => {
  assert.equal(DEFAULT_FORM_SETTINGS.submitButtonText, 'Submit');
  assert.equal(DEFAULT_FORM_SETTINGS.spam.honeypot, true);
  assert.equal(DEFAULT_FORM_SETTINGS.webhook.method, 'POST');
  assert.equal(DEFAULT_FORM_ANALYTICS.views, 0);
  assert.deepEqual(DEFAULT_FORM_ANALYTICS.dropOffByField, {});
});

test('EmailService.renderTemplate substitutes {{variables}}', () => {
  const out = EmailService.renderTemplate('Hi {{name}}, we got {{count}}', { name: 'Sam', count: 3 });
  assert.equal(out, 'Hi Sam, we got 3');
});

test('renderTemplate leaves unknown variables blank', () => {
  assert.equal(EmailService.renderTemplate('A{{missing}}B', {}), 'AB');
});

test('renderTemplate handles empty template', () => {
  assert.equal(EmailService.renderTemplate('', { a: 1 }), '');
});
