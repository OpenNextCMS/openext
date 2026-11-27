'use client';
import { apiUrl } from '@/lib/apiClient';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SettingField {
  key: string;
  label: string;
  type: string;
  default: unknown;
  group: string;
}

interface CustomizationPayload {
  themeSlug: string;
  values: Record<string, unknown>;
  defaults: Record<string, unknown>;
  schema: SettingField[];
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json.data as T;
}

export default function ThemeCustomizerPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [schema, setSchema] = useState<SettingField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [themeName, setThemeName] = useState(slug);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [custom, detail] = await Promise.all([
        unwrap<CustomizationPayload>(
          await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/customization`))
        ),
        unwrap<{ name: string }>(
          await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}`))
        ).catch(() => ({ name: slug })),
      ]);
      setSchema(custom.schema ?? []);
      setValues({ ...custom.defaults, ...custom.values });
      setThemeName(detail.name);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, SettingField[]>();
    for (const field of schema) {
      const g = field.group || 'general';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(field);
    }
    return [...map.entries()];
  }, [schema]);

  const save = async () => {
    setSaving(true);
    try {
      await unwrap(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/customization`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        })
      );
      toast.success('Customization saved.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const startPreview = async () => {
    setPreviewing(true);
    try {
      await unwrap(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/preview`), {
          method: 'POST',
        })
      );
      window.open('/', '_blank', 'noopener');
      toast.success('Preview opened — navigate your site with this theme.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  };

  const updateValue = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b bg-card p-6 lg:w-[380px] lg:border-b-0 lg:border-r">
        <div className="mb-6 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/theme-engine/${encodeURIComponent(slug)}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">Customize</h1>
            <p className="text-xs text-muted-foreground">{themeName}</p>
          </div>
        </div>

        {schema.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This theme has no customizable settings declared in <code>theme.json</code>.
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map(([group, fields]) => (
              <div key={group}>
                <h2 className="mb-3 text-sm font-semibold capitalize">{group}</h2>
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'color' ? (
                        <div className="flex gap-2">
                          <Input
                            id={field.key}
                            type="color"
                            value={String(values[field.key] ?? field.default ?? '#000000')}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            className="h-10 w-14 p-1"
                          />
                          <Input
                            value={String(values[field.key] ?? field.default ?? '')}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                          />
                        </div>
                      ) : field.type === 'number' ? (
                        <Input
                          id={field.key}
                          type="number"
                          value={String(values[field.key] ?? field.default ?? '')}
                          onChange={(e) => updateValue(field.key, Number(e.target.value))}
                        />
                      ) : (
                        <Input
                          id={field.key}
                          value={String(values[field.key] ?? field.default ?? '')}
                          onChange={(e) => updateValue(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
          <Button variant="outline" onClick={startPreview} disabled={previewing}>
            {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Preview Site
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col bg-muted/30 p-4 lg:p-6">
        <p className="mb-3 text-sm text-muted-foreground">
          Live preview uses real CMS data. Save customizations, then open a preview session to see changes on your site.
        </p>
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed bg-background p-8 text-center">
          <div>
            <Eye className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Site preview</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Click <strong>Preview Site</strong> to browse your website with <strong>{themeName}</strong> and these settings applied.
            </p>
            <Button className="mt-4" variant="secondary" onClick={startPreview} disabled={previewing}>
              Open Live Preview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
