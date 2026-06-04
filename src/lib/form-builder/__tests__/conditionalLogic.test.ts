import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConditions, evaluateGroup } from '@/lib/form-builder/conditionalLogic';
import type { IFormField, ConditionalRule } from '@/types/form-builder';

function field(id: string, rules?: ConditionalRule[], required = false): IFormField {
  return { id, type: 'text', label: id, order: 0, required, conditionalRules: rules };
}

test('field is visible and uses own required by default', () => {
  const state = evaluateConditions([field('a', undefined, true)], {});
  assert.deepEqual(state.a, { visible: true, required: true });
});

test('hide action hides the field when matched', () => {
  const rule: ConditionalRule = {
    id: 'r1',
    action: 'hide',
    group: { join: 'AND', conditions: [{ fieldId: 'a', operator: 'equals', value: 'x' }] },
  };
  const fields = [field('a'), field('b', [rule])];
  assert.equal(evaluateConditions(fields, { a: 'x' }).b.visible, false);
  assert.equal(evaluateConditions(fields, { a: 'y' }).b.visible, true);
});

test('makeRequired forces required when matched', () => {
  const rule: ConditionalRule = {
    id: 'r2',
    action: 'makeRequired',
    group: { join: 'AND', conditions: [{ fieldId: 'a', operator: 'isNotEmpty' }] },
  };
  const fields = [field('a'), field('b', [rule])];
  assert.equal(evaluateConditions(fields, { a: 'hi' }).b.required, true);
  assert.equal(evaluateConditions(fields, { a: '' }).b.required, false);
});

test('AND requires all conditions', () => {
  const group = {
    join: 'AND' as const,
    conditions: [
      { fieldId: 'a', operator: 'equals' as const, value: '1' },
      { fieldId: 'b', operator: 'equals' as const, value: '2' },
    ],
  };
  assert.equal(evaluateGroup(group, { a: '1', b: '2' }), true);
  assert.equal(evaluateGroup(group, { a: '1', b: '9' }), false);
});

test('OR requires any condition', () => {
  const group = {
    join: 'OR' as const,
    conditions: [
      { fieldId: 'a', operator: 'equals' as const, value: '1' },
      { fieldId: 'b', operator: 'equals' as const, value: '2' },
    ],
  };
  assert.equal(evaluateGroup(group, { a: '1', b: '9' }), true);
  assert.equal(evaluateGroup(group, { a: '0', b: '0' }), false);
});

test('nested groups evaluate recursively', () => {
  const group = {
    join: 'AND' as const,
    conditions: [{ fieldId: 'a', operator: 'equals' as const, value: '1' }],
    groups: [
      {
        join: 'OR' as const,
        conditions: [
          { fieldId: 'b', operator: 'equals' as const, value: 'x' },
          { fieldId: 'c', operator: 'equals' as const, value: 'y' },
        ],
      },
    ],
  };
  assert.equal(evaluateGroup(group, { a: '1', b: 'x', c: '' }), true);
  assert.equal(evaluateGroup(group, { a: '1', b: '', c: '' }), false);
  assert.equal(evaluateGroup(group, { a: '0', b: 'x', c: 'y' }), false);
});

test('comparison operators', () => {
  const mk = (operator: 'greaterThan' | 'lessThan' | 'contains', value: string | number) => ({
    join: 'AND' as const,
    conditions: [{ fieldId: 'a', operator, value }],
  });
  assert.equal(evaluateGroup(mk('greaterThan', 5), { a: 10 }), true);
  assert.equal(evaluateGroup(mk('lessThan', 5), { a: 10 }), false);
  assert.equal(evaluateGroup(mk('contains', 'bc'), { a: 'abcd' }), true);
});
