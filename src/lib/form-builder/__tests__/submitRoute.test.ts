import test from 'node:test';
import assert from 'node:assert/strict';
import { SubmissionService } from '@/lib/form-builder/services/submissionService';
import { DEFAULT_FORM_SETTINGS, HONEYPOT_FIELD_NAME } from '@/lib/form-builder/constants';
import type { IForm, IFormField } from '@/types/form-builder';

/**
 * Tests for the submission pipeline's pure logic (validation, spam detection,
 * conditional-aware validation). DB-backed throttle/persist are integration
 * concerns covered separately.
 */

function makeForm(fields: IFormField[], settingsOverride: Partial<IForm['settings']> = {}): IForm {
  return {
    name: 'Test',
    slug: 'test',
    status: 'published',
    fields,
    settings: { ...DEFAULT_FORM_SETTINGS, ...settingsOverride },
    analytics: { views: 0, starts: 0, completions: 0, conversionRate: 0, dropOffByField: {}, timeline: [] },
    versions: [],
  };
}

const tf = (id: string, type: IFormField['type'], required = false): IFormField => ({
  id,
  type,
  label: id,
  order: 0,
  required,
});

test('valid submission passes', () => {
  const form = makeForm([tf('name', 'text', true), tf('email', 'email', true)]);
  const r = SubmissionService.validateSubmission(form, { name: 'Sam', email: 'a@b.com' });
  assert.equal(r.valid, true);
});

test('invalid submission returns field errors', () => {
  const form = makeForm([tf('email', 'email', true)]);
  const r = SubmissionService.validateSubmission(form, { email: 'bad' });
  assert.equal(r.valid, false);
  assert.ok(r.errors.email);
});

test('hidden (conditionally hidden) required field is not enforced', () => {
  const trigger = tf('subscribe', 'text');
  const dependent: IFormField = {
    ...tf('email', 'email', true),
    conditionalRules: [
      {
        id: 'r',
        action: 'hide',
        group: { join: 'AND', conditions: [{ fieldId: 'subscribe', operator: 'equals', value: 'no' }] },
      },
    ],
  };
  const form = makeForm([trigger, dependent]);
  // When hidden, the missing required email should NOT fail validation.
  const r = SubmissionService.validateSubmission(form, { subscribe: 'no' });
  assert.equal(r.valid, true);
});

test('honeypot triggers spam detection', () => {
  const form = makeForm([tf('name', 'text')], { spam: { ...DEFAULT_FORM_SETTINGS.spam, honeypot: true } });
  assert.equal(SubmissionService.detectSpam({ [HONEYPOT_FIELD_NAME]: 'bot' }, form.settings), true);
  assert.equal(SubmissionService.detectSpam({ name: 'human' }, form.settings), false);
});

test('honeypot disabled never flags spam', () => {
  const form = makeForm([], { spam: { ...DEFAULT_FORM_SETTINGS.spam, honeypot: false } });
  assert.equal(SubmissionService.detectSpam({ [HONEYPOT_FIELD_NAME]: 'bot' }, form.settings), false);
});
