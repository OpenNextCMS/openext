'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Monitor, Tablet, Smartphone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IBlogThemeSettings } from '@/types/index';
import { DEFAULT_BLOG_THEME, mergeTheme, themeToCssVars, contrastRatio } from '@/lib/theme/cssVars';

type Breakpoint = 'desktop' | 'tablet' | 'mobile';
const frameWidth: Record<Breakpoint, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function DesignControls() {
  const [theme, setTheme] = useState<IBlogThemeSettings>(DEFAULT_BLOG_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    fetch('/api/theme-settings')
      .then((r) => r.json())
      .then((res) => res?.data && setTheme(mergeTheme(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const previewVars = useMemo(() => themeToCssVars(theme), [theme]);
  const textContrast = contrastRatio(theme.colors.text, theme.colors.background);
  const primaryContrast = contrastRatio('#ffffff', theme.colors.primary);

  // Typed setters for nested groups.
  const setColor = (k: keyof IBlogThemeSettings['colors'], v: string) =>
    setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const setType = (k: keyof IBlogThemeSettings['typography'], v: string | number) =>
    setTheme((t) => ({ ...t, typography: { ...t.typography, [k]: v } }));
  const setLayout = (k: keyof IBlogThemeSettings['layout'], v: string | number) =>
    setTheme((t) => ({ ...t, layout: { ...t.layout, [k]: v } as IBlogThemeSettings['layout'] }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(theme),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Save failed');
      toast.success('Design saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cardStyleClass =
    theme.cardStyle === 'shadow'
      ? 'shadow-lg'
      : theme.cardStyle === 'bordered'
        ? 'border'
        : '';

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[360px_1fr]">
      {/* Controls */}
      <div className="space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Design</h1>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>

        {/* Typography */}
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Typography</h2>
          <div className="space-y-1">
            <Label>Heading font</Label>
            <Input value={theme.typography.headingFont} onChange={(e) => setType('headingFont', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Body font</Label>
            <Input value={theme.typography.bodyFont} onChange={(e) => setType('bodyFont', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Base size (px)</Label>
              <Input
                type="number"
                value={theme.typography.baseSize}
                onChange={(e) => setType('baseSize', Number(e.target.value) || 16)}
              />
            </div>
            <div className="space-y-1">
              <Label>Line height</Label>
              <Input
                type="number"
                step="0.1"
                value={theme.typography.lineHeight}
                onChange={(e) => setType('lineHeight', Number(e.target.value) || 1.6)}
              />
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Colors</h2>
          {(['primary', 'background', 'text', 'accent'] as const).map((key) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label className="capitalize">{key}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border"
                />
                <Input
                  value={theme.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
          ))}
          {textContrast !== null && textContrast < 4.5 ? (
            <p className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" /> Text/background contrast is low ({textContrast.toFixed(1)}:1)
            </p>
          ) : null}
          {primaryContrast !== null && primaryContrast < 3 ? (
            <p className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" /> White text on primary may be hard to read
            </p>
          ) : null}
        </section>

        {/* Layout */}
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="text-sm font-bold uppercase text-muted-foreground">Layout</h2>
          <div className="space-y-1">
            <Label>Width</Label>
            <select
              className={selectClass}
              value={theme.layout.width}
              onChange={(e) => setLayout('width', e.target.value)}
            >
              <option value="full">Full width</option>
              <option value="boxed">Boxed</option>
            </select>
          </div>
          {theme.layout.width === 'boxed' ? (
            <div className="space-y-1">
              <Label>Max width (px)</Label>
              <Input
                type="number"
                value={theme.layout.maxWidth}
                onChange={(e) => setLayout('maxWidth', Number(e.target.value) || 1200)}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label>Border radius: {theme.radius}px</Label>
            <input
              type="range"
              min={0}
              max={32}
              value={theme.radius}
              onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label>Card style</Label>
            <select
              className={selectClass}
              value={theme.cardStyle}
              onChange={(e) =>
                setTheme((t) => ({ ...t, cardStyle: e.target.value as IBlogThemeSettings['cardStyle'] }))
              }
            >
              <option value="flat">Flat</option>
              <option value="shadow">Shadow</option>
              <option value="bordered">Bordered</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Sidebar position</Label>
            <select
              className={selectClass}
              value={theme.sidebarPosition}
              onChange={(e) =>
                setTheme((t) => ({
                  ...t,
                  sidebarPosition: e.target.value as IBlogThemeSettings['sidebarPosition'],
                }))
              }
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>Dark mode</Label>
            <select
              className={selectClass}
              value={theme.darkMode}
              onChange={(e) =>
                setTheme((t) => ({ ...t, darkMode: e.target.value as IBlogThemeSettings['darkMode'] }))
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (system)</option>
            </select>
          </div>
        </section>
      </div>

      {/* Live preview */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
          {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => {
            const Icon = bp === 'desktop' ? Monitor : bp === 'tablet' ? Tablet : Smartphone;
            return (
              <button
                key={bp}
                type="button"
                onClick={() => setBreakpoint(bp)}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${
                  breakpoint === bp ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" /> {bp}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center rounded-2xl border bg-muted/30 p-4">
          <div className={`${frameWidth[breakpoint]} transition-all`}>
            <div style={previewVars} className="overflow-hidden rounded-xl p-6">
              <h1 style={{ fontFamily: 'var(--font-heading)' }} className="mb-2 text-3xl font-black">
                The quick brown fox
              </h1>
              <p className="mb-4 opacity-80">
                Jumps over the lazy dog. This preview reflects your typography, colors, radius and
                card style in real time.
              </p>
              <div
                className={`mb-4 rounded-[var(--radius)] bg-white/60 p-4 ${cardStyleClass}`}
                style={{ borderColor: 'var(--color-accent)' }}
              >
                <h3 className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Sample card
                </h3>
                <p className="text-sm opacity-70">Card style: {theme.cardStyle}</p>
              </div>
              <button
                className="rounded-[var(--radius)] px-5 py-2 font-semibold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                Primary button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
