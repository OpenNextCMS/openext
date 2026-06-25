import type {
  IFormField,
  ConditionalCondition,
  ConditionalGroup,
  ConditionalOperator,
} from '@/types/form-builder';

/**
 * Conditional logic engine. Runs on the client in real time as the user fills
 * the form, and on the server as a guard. Produces a per-field visibility +
 * required map from the current values. Supports nested AND/OR groups.
 */

export interface FieldConditionState {
  visible: boolean;
  required: boolean;
}

export type ConditionStateMap = Record<string, FieldConditionState>;

function compare(
  left: unknown,
  operator: ConditionalOperator,
  right: unknown
): boolean {
  switch (operator) {
    case 'equals':
      return String(left ?? '') === String(right ?? '');
    case 'notEquals':
      return String(left ?? '') !== String(right ?? '');
    case 'contains':
      if (Array.isArray(left)) return left.map(String).includes(String(right));
      return String(left ?? '').includes(String(right ?? ''));
    case 'greaterThan':
      return Number(left) > Number(right);
    case 'lessThan':
      return Number(left) < Number(right);
    case 'isEmpty':
      return left == null || left === '' || (Array.isArray(left) && left.length === 0);
    case 'isNotEmpty':
      return !(left == null || left === '' || (Array.isArray(left) && left.length === 0));
    default:
      return false;
  }
}

function evalCondition(
  condition: ConditionalCondition,
  values: Record<string, unknown>
): boolean {
  return compare(values[condition.fieldId], condition.operator, condition.value);
}

/** Recursively evaluate a (possibly nested) condition group. */
export function evaluateGroup(
  group: ConditionalGroup,
  values: Record<string, unknown>
): boolean {
  const join = group.join === 'OR' ? 'OR' : 'AND';
  const conditionResults = (group.conditions ?? []).map((c) => evalCondition(c, values));
  const groupResults = (group.groups ?? []).map((g) => evaluateGroup(g, values));
  const all = [...conditionResults, ...groupResults];
  if (all.length === 0) return true;
  return join === 'AND' ? all.every(Boolean) : all.some(Boolean);
}

/**
 * Evaluate every field's conditional rules against the current values.
 * Defaults: a field is visible and uses its own `required` flag. A matching
 * `hide` wins over `show`; `makeRequired` forces required when matched.
 */
export function evaluateConditions(
  fields: IFormField[],
  values: Record<string, unknown>
): ConditionStateMap {
  const map: ConditionStateMap = {};

  for (const field of fields) {
    map[field.id] = { visible: true, required: !!field.required };
  }

  for (const field of fields) {
    const rules = field.conditionalRules ?? [];
    for (const rule of rules) {
      const targetId = rule.targetFieldId || field.id;
      if (!map[targetId]) continue;
      const matched = evaluateGroup(rule.group, values);
      if (!matched) continue;
      if (rule.action === 'show') map[targetId].visible = true;
      else if (rule.action === 'hide') map[targetId].visible = false;
      else if (rule.action === 'makeRequired') map[targetId].required = true;
    }
  }

  return map;
}

/** Convenience: list of field ids currently visible, in field order. */
export function visibleFieldIds(
  fields: IFormField[],
  values: Record<string, unknown>
): string[] {
  const state = evaluateConditions(fields, values);
  return fields.filter((f) => state[f.id]?.visible !== false).map((f) => f.id);
}
