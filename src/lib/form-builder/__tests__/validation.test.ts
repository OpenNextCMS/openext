import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZodSchema, validateSubmission } from '@/lib/form-builder/validation';
import type { IFormField } from '@/types/form-builder';

/**
 * Unit tests for buildZodSchema across field types.
 * Run with: node --test (via a TS loader, e.g. tsx).
 */

function field(partial: Partial<IFormField> & Pick<IFormField, 'id' | 'type'>): IFormField {
  return { label: partial.id, order: 0, ...partial } as IFormField;
}

test('required text field rejects empty, accepts value', () => {
  const schema = buildZodSchema([field({ id: 'name', type: 'text', required: true })]);
  assert.equal(validateSubmission(schema, { name: '' }).valid, false);
  assert.equal(validateSubmission(schema, { name: 'Sam' }).valid, true);
});

test('optional field accepts empty', () => {
  const schema = buildZodSchema([field({ id: 'bio', type: 'textarea', required: false })]);
  assert.equal(validateSubmission(schema, { bio: '' }).valid, true);
  assert.equal(validateSubmission(schema, {}).valid, true);
});

test('email field validates format', () => {
  const schema = buildZodSchema([field({ id: 'email', type: 'email', required: true })]);
  assert.equal(validateSubmission(schema, { email: 'nope' }).valid, false);
  assert.equal(validateSubmission(schema, { email: 'a@b.com' }).valid, true);
});

test('phone field enforces E.164-ish format', () => {
  const schema = buildZodSchema([field({ id: 'p', type: 'phone', required: true })]);
  assert.equal(validateSubmission(schema, { p: 'abc' }).valid, false);
  assert.equal(validateSubmission(schema, { p: '+14155552671' }).valid, true);
});

test('url field validates', () => {
  const schema = buildZodSchema([field({ id: 'u', type: 'url', required: true })]);
  assert.equal(validateSubmission(schema, { u: 'not a url' }).valid, false);
  assert.equal(validateSubmission(schema, { u: 'https://x.com' }).valid, true);
});

test('number field coerces strings', () => {
  const schema = buildZodSchema([field({ id: 'n', type: 'number', required: true })]);
  const r = validateSubmission(schema, { n: '42' });
  assert.equal(r.valid, true);
});

test('minLength / maxLength enforced', () => {
  const schema = buildZodSchema([
    field({ id: 't', type: 'text', required: true, validation: { minLength: 3, maxLength: 5 } }),
  ]);
  assert.equal(validateSubmission(schema, { t: 'ab' }).valid, false);
  assert.equal(validateSubmission(schema, { t: 'abcdef' }).valid, false);
  assert.equal(validateSubmission(schema, { t: 'abcd' }).valid, true);
});

test('checkbox group is an array', () => {
  const schema = buildZodSchema([
    field({ id: 'c', type: 'checkbox', options: [{ label: 'A', value: 'a' }] }),
  ]);
  assert.equal(validateSubmission(schema, { c: ['a'] }).valid, true);
});

test('structural fields (divider/section_header) are skipped', () => {
  const schema = buildZodSchema([
    field({ id: 'd', type: 'divider' }),
    field({ id: 'h', type: 'section_header' }),
  ]);
  assert.equal(validateSubmission(schema, {}).valid, true);
});

test('every supported field type builds without throwing', () => {
  const types: IFormField['type'][] = [
    'text', 'textarea', 'email', 'phone', 'number', 'url', 'password', 'dropdown',
    'radio', 'checkbox', 'date', 'time', 'file', 'rating', 'hidden', 'signature',
    'section_header', 'divider',
  ];
  const fields = types.map((t, i) => field({ id: `f${i}`, type: t }));
  assert.doesNotThrow(() => buildZodSchema(fields));
});
