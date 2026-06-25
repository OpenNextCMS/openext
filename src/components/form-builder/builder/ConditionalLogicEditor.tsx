'use client';

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateField, selectOrderedFields } from '@/redux/formBuilderSlice';
import type {
  IFormField,
  ConditionalRule,
  ConditionalCondition,
  ConditionalOperator,
  ConditionalAction,
  ConditionalLogicJoin,
} from '@/types/form-builder';

const OPERATORS: { value: ConditionalOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greaterThan', label: 'greater than' },
  { value: 'lessThan', label: 'less than' },
  { value: 'isEmpty', label: 'is empty' },
  { value: 'isNotEmpty', label: 'is not empty' },
];

const ACTIONS: { value: ConditionalAction; label: string }[] = [
  { value: 'show', label: 'Show this field' },
  { value: 'hide', label: 'Hide this field' },
  { value: 'makeRequired', label: 'Make required' },
];

export function ConditionalLogicEditor({ field }: { field: IFormField }) {
  const dispatch = useAppDispatch();
  const allFields = useAppSelector(selectOrderedFields);
  const otherFields = allFields.filter((f) => f.id !== field.id && f.type !== 'divider');
  const rules = field.conditionalRules ?? [];

  const save = (next: ConditionalRule[]) =>
    dispatch(updateField({ id: field.id, patch: { conditionalRules: next } }));

  const addRule = () => {
    const sourceId = otherFields[0]?.id ?? '';
    const rule: ConditionalRule = {
      id: uuidv4(),
      action: 'show',
      group: { join: 'AND', conditions: [{ fieldId: sourceId, operator: 'equals', value: '' }] },
    };
    save([...rules, rule]);
  };

  const updateRule = (rId: string, patch: Partial<ConditionalRule>) =>
    save(rules.map((r) => (r.id === rId ? { ...r, ...patch } : r)));

  const updateCondition = (rId: string, ci: number, patch: Partial<ConditionalCondition>) =>
    save(
      rules.map((r) => {
        if (r.id !== rId) return r;
        const conditions = r.group.conditions.map((c, i) => (i === ci ? { ...c, ...patch } : c));
        return { ...r, group: { ...r.group, conditions } };
      })
    );

  const addCondition = (rId: string) =>
    save(
      rules.map((r) =>
        r.id === rId
          ? {
              ...r,
              group: {
                ...r.group,
                conditions: [
                  ...r.group.conditions,
                  { fieldId: otherFields[0]?.id ?? '', operator: 'equals', value: '' },
                ],
              },
            }
          : r
      )
    );

  const removeCondition = (rId: string, ci: number) =>
    save(
      rules.map((r) =>
        r.id === rId
          ? { ...r, group: { ...r.group, conditions: r.group.conditions.filter((_, i) => i !== ci) } }
          : r
      )
    );

  if (otherFields.length === 0) {
    return <p className="text-sm text-muted-foreground">Add other fields first to build conditional rules.</p>;
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <div key={rule.id} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase text-muted-foreground">If</Label>
            <Button type="button" variant="ghost" size="icon" onClick={() => save(rules.filter((r) => r.id !== rule.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {rule.group.conditions.map((cond, ci) => (
            <div key={ci} className="space-y-1">
              {ci > 0 ? (
                <div className="flex gap-1">
                  {(['AND', 'OR'] as ConditionalLogicJoin[]).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => updateRule(rule.id, { group: { ...rule.group, join: j } })}
                      className={`rounded px-2 py-0.5 text-xs ${
                        rule.group.join === j ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center gap-1">
                <select
                  className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                  value={cond.fieldId}
                  onChange={(e) => updateCondition(rule.id, ci, { fieldId: e.target.value })}
                >
                  {otherFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={cond.operator}
                  onChange={(e) => updateCondition(rule.id, ci, { operator: e.target.value as ConditionalOperator })}
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {!['isEmpty', 'isNotEmpty'].includes(cond.operator) ? (
                  <Input
                    className="h-9 w-24"
                    value={cond.value == null ? '' : String(cond.value)}
                    onChange={(e) => updateCondition(rule.id, ci, { value: e.target.value })}
                  />
                ) : null}
                {rule.group.conditions.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(rule.id, ci)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={() => addCondition(rule.id)}>
            <Plus className="mr-1 h-3 w-3" /> Add condition
          </Button>

          <div className="space-y-1 pt-1">
            <Label className="text-xs uppercase text-muted-foreground">Then</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={rule.action}
              onChange={(e) => updateRule(rule.id, { action: e.target.value as ConditionalAction })}
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addRule}>
        <Plus className="mr-1 h-4 w-4" /> Add rule
      </Button>
    </div>
  );
}
