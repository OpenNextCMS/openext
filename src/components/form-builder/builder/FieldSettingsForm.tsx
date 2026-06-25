'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks';
import { updateField } from '@/redux/formBuilderSlice';
import type { IFormField, FieldOption, FieldWidth } from '@/types/form-builder';

const WIDTHS: FieldWidth[] = ['25%', '50%', '75%', '100%'];
const HAS_OPTIONS = new Set(['dropdown', 'radio', 'checkbox']);

export function FieldSettingsForm({ field }: { field: IFormField }) {
  const dispatch = useAppDispatch();
  const patch = (p: Partial<IFormField>) => dispatch(updateField({ id: field.id, patch: p }));

  const setOption = (i: number, key: keyof FieldOption, val: string) => {
    const options = [...(field.options ?? [])];
    options[i] = { ...options[i], [key]: val };
    patch({ options });
  };
  const addOption = () => {
    const n = (field.options?.length ?? 0) + 1;
    patch({ options: [...(field.options ?? []), { label: `Option ${n}`, value: `option-${n}` }] });
  };
  const removeOption = (i: number) =>
    patch({ options: (field.options ?? []).filter((_, idx) => idx !== i) });

  const structural = field.type === 'divider';

  return (
    <div className="space-y-4">
      {!structural ? (
        <div className="space-y-1.5">
          <Label htmlFor="f-label">Label</Label>
          <Input id="f-label" value={field.label} onChange={(e) => patch({ label: e.target.value })} />
        </div>
      ) : null}

      {!['divider', 'section_header', 'rating', 'signature', 'file', 'checkbox', 'radio'].includes(
        field.type
      ) ? (
        <div className="space-y-1.5">
          <Label htmlFor="f-ph">Placeholder</Label>
          <Input
            id="f-ph"
            value={field.placeholder ?? ''}
            onChange={(e) => patch({ placeholder: e.target.value })}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="f-help">Help text</Label>
        <Input id="f-help" value={field.helpText ?? ''} onChange={(e) => patch({ helpText: e.target.value })} />
      </div>

      {!['section_header', 'divider'].includes(field.type) ? (
        <div className="flex items-center justify-between">
          <Label htmlFor="f-req">Required</Label>
          <Switch
            id="f-req"
            checked={!!field.required}
            onCheckedChange={(v) => patch({ required: v })}
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Width</Label>
        <div className="flex gap-1">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => patch({ width: w })}
              className={`flex-1 rounded-md border px-2 py-1 text-xs ${
                field.width === w ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {!['section_header', 'divider', 'file', 'signature'].includes(field.type) ? (
        <div className="space-y-1.5">
          <Label htmlFor="f-default">Default value</Label>
          <Input
            id="f-default"
            value={field.defaultValue == null ? '' : String(field.defaultValue)}
            onChange={(e) => patch({ defaultValue: e.target.value })}
          />
        </div>
      ) : null}

      {HAS_OPTIONS.has(field.type) ? (
        <div className="space-y-2">
          <Label>Options</Label>
          {(field.options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={opt.label}
                placeholder="Label"
                onChange={(e) => setOption(i, 'label', e.target.value)}
              />
              <Input
                value={opt.value}
                placeholder="Value"
                onChange={(e) => setOption(i, 'value', e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption}>
            <Plus className="mr-1 h-4 w-4" /> Add option
          </Button>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="f-css">CSS classes</Label>
        <Input id="f-css" value={field.cssClass ?? ''} onChange={(e) => patch({ cssClass: e.target.value })} />
      </div>
    </div>
  );
}
