'use client';

import { useMemo, useState } from 'react';
import { Save, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { themeSystemApi, ThemeApiError } from './api';
import type { InstalledTheme } from './types';

/**
 * ThemeSettingsForm — the auto-generated Theme Options page (spec §1, §14).
 * Controls are derived from `theme.json.settings` with NO per-theme wiring:
 *   boolean → switch, "#hex" → color, number → number field, string → text.
 */

interface Props {
  theme: InstalledTheme;
  onSaved?: (theme: InstalledTheme) => void;
}

type FieldKind = 'boolean' | 'color' | 'number' | 'text' | 'json';

function kindOf(value: unknown): FieldKind {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim()) ? 'color' : 'text';
  return 'json';
}

function labelize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ThemeSettingsForm({ theme, onSaved }: Props) {
  const initial = useMemo(() => ({ ...(theme.settings ?? {}) }) as Record<string, unknown>, [theme.settings]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [saving, setSaving] = useState(false);

  const entries = Object.entries(values);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const setValue = (key: string, value: unknown) => setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await themeSystemApi.updateSettings(theme.slug, values);
      toast.success('Theme options saved.');
      onSaved?.(updated);
    } catch (err) {
      toast.error(err instanceof ThemeApiError ? err.message : 'Failed to save options.');
    } finally {
      setSaving(false);
    }
  };

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">This theme exposes no options in its manifest.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {entries.map(([key, value]) => {
          const kind = kindOf(value);
          const id = `opt-${key}`;
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={id} className="flex items-center justify-between">
                <span>{labelize(key)}</span>
                {kind === 'boolean' && (
                  <Switch id={id} checked={Boolean(value)} onCheckedChange={(c) => setValue(key, c)} />
                )}
              </Label>

              {kind === 'color' && (
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`${labelize(key)} color`}
                    type="color"
                    value={String(value)}
                    onChange={(e) => setValue(key, e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border bg-transparent p-1"
                  />
                  <Input id={id} value={String(value)} onChange={(e) => setValue(key, e.target.value)} className="font-mono" />
                </div>
              )}

              {kind === 'number' && (
                <Input
                  id={id}
                  type="number"
                  value={Number(value)}
                  onChange={(e) => setValue(key, e.target.value === '' ? 0 : Number(e.target.value))}
                />
              )}

              {kind === 'text' && (
                <Input id={id} value={String(value)} onChange={(e) => setValue(key, e.target.value)} />
              )}

              {kind === 'json' && (
                <textarea
                  id={id}
                  className="min-h-20 w-full rounded-md border bg-background p-2 font-mono text-xs"
                  value={JSON.stringify(value, null, 2)}
                  onChange={(e) => {
                    try {
                      setValue(key, JSON.parse(e.target.value));
                    } catch {
                      /* keep last valid value until JSON parses */
                    }
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save options
        </Button>
        <Button variant="ghost" onClick={() => setValues(initial)} disabled={!dirty || saving}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
