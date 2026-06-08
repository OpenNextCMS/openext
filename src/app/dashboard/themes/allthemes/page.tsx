'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, Pencil, Copy, Trash2, Check, Palette, Loader2, Lock, Search, Eye,
  Monitor, Tablet, Smartphone, ChevronDown, Sparkles, LayoutGrid, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { themeApi } from '@/components/theme-builder/api';
import { mergeThemeConfig } from '@/lib/theme/cssVars.site';
import { PreviewCanvas } from '@/components/theme-preview/PreviewCanvas';
import type { ThemeDTO, ThemeConfig } from '@/types/theme';

/* ──────────────────────────────────────────────────────────────────────────
 * Polished Theme Gallery — wired to the REAL Theme model + APIs.
 *   • Overview stats + active-theme banner
 *   • Search + sort
 *   • Theme cards with live mini-mockup, status badges, details, full actions
 *   • Live Preview drawer (any theme, device toggle) via the real PreviewCanvas
 * System themes stay read-only (duplicate-to-edit); the active theme can't be
 * deleted. Activating a theme re-skins the live public site.
 * ────────────────────────────────────────────────────────────────────────── */

/** Compact live mockup driven by a theme's own tokens (header + hero + buttons). */
function ThemeCardPreview({ theme }: { theme?: ThemeConfig }) {
  const c = theme?.colors;
  const t = theme?.typography;
  const r = theme?.radius;
  return (
    <div
      className="flex h-32 flex-col overflow-hidden text-[7px] leading-tight"
      style={{ backgroundColor: c?.background ?? '#ffffff', fontFamily: t?.bodyFont }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: c?.surface ?? '#f8fafc', color: c?.text ?? '#111827' }}
      >
        <span className="font-bold" style={{ fontFamily: t?.headingFont }}>Brand</span>
        <div className="flex gap-2" style={{ color: c?.muted ?? '#6b7280' }}>
          <span>Home</span><span>Features</span><span>Pricing</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-start justify-center gap-1.5 px-3">
        <div className="text-[12px] font-bold leading-none" style={{ color: c?.text ?? '#111827', fontFamily: t?.headingFont }}>
          Build something great
        </div>
        <div style={{ color: c?.muted ?? '#6b7280' }}>A short supporting line that adapts to the theme.</div>
        <div className="mt-1 flex gap-1.5">
          <span className="px-2 py-1 font-semibold" style={{ backgroundColor: c?.primary ?? '#2563eb', color: c?.background ?? '#fff', borderRadius: r?.md ?? '8px' }}>Get started</span>
          <span className="px-2 py-1 font-semibold" style={{ backgroundColor: c?.accent ?? '#f59e0b', color: c?.background ?? '#fff', borderRadius: r?.md ?? '8px' }}>Learn more</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tint }: { icon: any; label: string; value: React.ReactNode; tint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tint}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

type SortKey = 'updated' | 'name' | 'status';
const DEVICE_WIDTH: Record<string, string> = { desktop: 'w-full', tablet: 'w-[768px] max-w-full', mobile: 'w-[390px] max-w-full' };

export default function AllThemesPage() {
  const [themes, setThemes] = useState<ThemeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Live Preview drawer
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setThemes(await themeApi.list());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activate = async (id: string) => {
    setBusyId(id);
    try { await themeApi.activate(id); toast.success('Theme activated — your live site now uses it'); await load(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  };
  const duplicate = async (id: string) => {
    setBusyId(id);
    try { await themeApi.duplicate(id); toast.success('Theme duplicated'); await load(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  };
  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    try { await themeApi.remove(id); toast.success('Theme deleted'); await load(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  };

  const active = themes.find((t) => t.isActive);
  const systemCount = themes.filter((t) => t.isSystemTheme).length;
  const customCount = themes.filter((t) => !t.isSystemTheme).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = themes.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    );
    const rank = (t: ThemeDTO) => (t.isActive ? 0 : t.isSystemTheme ? 2 : 1);
    const sorters: Record<SortKey, (a: ThemeDTO, b: ThemeDTO) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      updated: (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      status: (a, b) => rank(a) - rank(b),
    };
    return [...filtered].sort(sorters[sort]);
  }, [themes, query, sort]);

  const previewTheme = themes.find((t) => t._id === previewId);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Palette className="h-6 w-6" /> Themes</h1>
          <p className="text-sm text-muted-foreground">
            Customize your site appearance. The <b>active</b> theme drives your public pages.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!active} onClick={() => { setPreviewId(active?._id || null); setDevice('desktop'); }}>
            <Eye className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <Button asChild>
            <Link href="/dashboard/themes/new" prefetch><Plus className="mr-2 h-4 w-4" /> Create Theme</Link>
          </Button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={LayoutGrid} label="Total Themes" value={themes.length} tint="bg-indigo-100 text-indigo-600" />
        <StatCard icon={Check} label="Active Theme" value={<span className="truncate text-base">{active?.name ?? '—'}</span>} tint="bg-emerald-100 text-emerald-600" />
        <StatCard icon={Lock} label="System Themes" value={systemCount} tint="bg-slate-100 text-slate-600" />
        <StatCard icon={Sparkles} label="Custom Themes" value={customCount} tint="bg-purple-100 text-purple-600" />
      </div>

      {/* Active theme banner */}
      {active && (
        <div className="overflow-hidden rounded-xl border">
          <div
            className="flex flex-wrap items-end justify-between gap-4 p-6"
            style={{ background: `linear-gradient(135deg, ${active.theme?.colors?.primary ?? '#6366f1'}, ${active.theme?.colors?.secondary ?? '#8b5cf6'})` }}
          >
            <div className="text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Active
              </span>
              <h2 className="mt-2 text-3xl font-bold drop-shadow">{active.name}</h2>
              <p className="text-sm opacity-90">v{active.version} · {active.isSystemTheme ? 'System theme' : 'Custom theme'}</p>
              {active.description ? <p className="mt-1 max-w-lg text-sm opacity-90">{active.description}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setPreviewId(active._id); setDevice('desktop'); }}>
                <Eye className="mr-1.5 h-4 w-4" /> Preview
              </Button>
              <Button size="sm" asChild>
                <Link href={`/dashboard/themes/${active._id}`} prefetch><Pencil className="mr-1.5 h-4 w-4" /> Customize</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search themes…" className="pl-9" />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {query ? `No themes match “${query}”.` : 'No themes yet.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const busy = busyId === t._id;
            const isOpen = expanded === t._id;
            return (
              <div key={t._id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                <button type="button" className="block text-left" onClick={() => { setPreviewId(t._id); setDevice('desktop'); }} title="Open live preview">
                  <ThemeCardPreview theme={t.theme} />
                </button>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    {t.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                    {t.isSystemTheme ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> System
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                        <Sparkles className="h-3 w-3" /> Custom
                      </span>
                    )}
                  </div>
                  {t.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p> : null}
                  <p className="mt-auto text-xs text-muted-foreground">
                    v{t.version}{t.updatedAt ? ` · Updated ${new Date(t.updatedAt).toLocaleDateString()}` : ''}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!t.isActive && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => activate(t._id)}>
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Activate
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/dashboard/themes/${t._id}`} prefetch>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> {t.isSystemTheme ? 'View' : 'Customize'}
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => duplicate(t._id)}>
                      <Copy className="mr-1 h-3.5 w-3.5" /> Duplicate
                    </Button>
                    {!t.isSystemTheme && !t.isActive && (
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={busy} onClick={() => remove(t._id, t.name)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setExpanded(isOpen ? null : t._id)}>
                      Details <ChevronDown className={`ml-1 h-3.5 w-3.5 transition ${isOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-1 space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1.5">
                        {(['primary', 'secondary', 'accent', 'background', 'surface', 'text'] as const).map((k) => (
                          <span key={k} title={`${k}: ${t.theme?.colors?.[k]}`} className="h-5 w-5 rounded border" style={{ backgroundColor: t.theme?.colors?.[k] }} />
                        ))}
                      </div>
                      <p><b>Slug:</b> {t.slug}</p>
                      <p><b>Heading font:</b> {t.theme?.typography?.headingFont}</p>
                      <p><b>Type:</b> {t.isSystemTheme ? 'System (read-only — duplicate to edit)' : 'Custom'}</p>
                      {t.createdBy ? <p><b>Created by:</b> {t.createdBy}</p> : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Preview drawer */}
      <Dialog open={!!previewId} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2"><Eye className="h-5 w-5" /> Live Preview</span>
              {previewTheme && (
                <Select value={previewId ?? ''} onValueChange={(v) => setPreviewId(v)}>
                  <SelectTrigger className="h-8 w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t._id} value={t._id}>{t.name}{t.isActive ? ' (active)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
                {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
                  const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
                  return (
                    <button key={d} type="button" onClick={() => setDevice(d)}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs capitalize ${device === d ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                      <Icon className="h-3.5 w-3.5" /> {d}
                    </button>
                  );
                })}
              </div>
            </DialogTitle>
          </DialogHeader>
          {previewTheme && (
            <div className="flex max-h-[70vh] justify-center overflow-auto rounded-xl bg-muted/30 p-4">
              <div className={`${DEVICE_WIDTH[device]} transition-all`}>
                <div className="overflow-hidden rounded-xl border bg-white">
                  <PreviewCanvas config={mergeThemeConfig(previewTheme.theme)} componentVariants={previewTheme.componentVariants || {}} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
