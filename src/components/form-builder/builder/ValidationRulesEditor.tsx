'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '@/redux/hooks';
import { updateField } from '@/redux/formBuilderSlice';
import { formApi } from '@/components/form-builder/api';
import type { IFormField, FieldValidation } from '@/types/form-builder';

export function ValidationRulesEditor({ field }: { field: IFormField }) {
  const dispatch = useAppDispatch();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const v = field.validation ?? {};

  const patchValidation = (p: Partial<FieldValidation>) =>
    dispatch(updateField({ id: field.id, patch: { validation: { ...v, ...p } } }));

  const num = (s: string): number | undefined => {
    if (s === '') return undefined;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? undefined : n;
  };

  const runAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const rules = await formApi.aiValidation(aiPrompt, field.type);
      // Fold the AI rules into the field's validation object.
      const next: FieldValidation = { ...v };
      for (const r of rules) {
        if (r.type === 'minLength') next.minLength = Number(r.value);
        else if (r.type === 'maxLength') next.maxLength = Number(r.value);
        else if (r.type === 'regex') next.regex = String(r.value);
        else if (r.type === 'pattern') next.pattern = String(r.value);
        else if (['email', 'phone', 'url'].includes(r.type)) next.pattern = r.type;
        else if (r.type === 'custom') next.custom = String(r.value ?? r.message ?? '');
      }
      dispatch(updateField({ id: field.id, patch: { validation: next } }));
      toast.success('Validation rules applied');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const supportsLength = ['text', 'textarea', 'password', 'email', 'url', 'phone'].includes(field.type);

  return (
    <div className="space-y-4">
      {supportsLength ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="v-min">Min length</Label>
            <Input
              id="v-min"
              type="number"
              value={v.minLength ?? ''}
              onChange={(e) => patchValidation({ minLength: num(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-max">Max length</Label>
            <Input
              id="v-max"
              type="number"
              value={v.maxLength ?? ''}
              onChange={(e) => patchValidation({ maxLength: num(e.target.value) })}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="v-pattern">Pattern preset</Label>
        <select
          id="v-pattern"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={v.pattern ?? ''}
          onChange={(e) => patchValidation({ pattern: e.target.value || undefined })}
        >
          <option value="">None</option>
          <option value="email">Email</option>
          <option value="phone">Phone (E.164)</option>
          <option value="url">URL</option>
          <option value="alphanumeric">Alphanumeric</option>
          <option value="numeric">Numeric</option>
          <option value="letters">Letters only</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="v-regex">Custom regex</Label>
        <Input
          id="v-regex"
          value={v.regex ?? ''}
          placeholder="^[A-Z].*$"
          onChange={(e) => patchValidation({ regex: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1.5 rounded-md border bg-muted/40 p-3">
        <Label htmlFor="v-ai" className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Describe a rule (AI)
        </Label>
        <Input
          id="v-ai"
          value={aiPrompt}
          placeholder="e.g. Validate Indian mobile numbers"
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <Button type="button" size="sm" onClick={runAi} disabled={aiLoading || !aiPrompt.trim()}>
          {aiLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Generate rule
        </Button>
      </div>
    </div>
  );
}
