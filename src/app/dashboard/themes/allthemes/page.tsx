'use client';
import { apiUrl } from '@/lib/apiClient';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, Pencil, Copy, Trash2, Check, Palette, Loader2, Lock, Search, Eye,
  Monitor, Tablet, Smartphone, ChevronDown, Sparkles, LayoutGrid, Upload,
  FileJson, Download, LayoutTemplate,
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
import { mergeThemeConfig, DEFAULT_THEME_CONFIG } from '@/lib/theme/cssVars.site';
import { PreviewCanvas } from '@/components/theme-preview/PreviewCanvas';
import type { ThemeDTO, ThemeConfig } from '@/types/theme';
import {
  THEME_OPTIONS, WIZARD_THEME_TO_SLUG, type ThemeOption, type WizardThemeId,
} from '@/templates/types';

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

function StatCard({ icon: Icon, label, value, tint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; tint: string }) {
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

/** A swatch-driven card for one of the 8 design styles offered during onboarding. */
function OnboardingThemeCard({
  option, selected, busy, onActivate,
}: {
  option: ThemeOption;
  selected: boolean;
  busy: boolean;
  onActivate: (option: ThemeOption) => void;
}) {
  const c = option.colors;
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow ${
        selected ? 'border-primary ring-2 ring-primary' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex h-28 flex-col justify-between p-3" style={{ background: c.background }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: c.text, fontFamily: option.fontFamily }}>
            {option.label}
          </span>
          {selected && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
              <Check className="h-3 w-3" /> Selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ background: c.primary, borderRadius: option.radius }}
          >
            Button
          </span>
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.secondary }} />
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.text }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex gap-1">
          {[c.primary, c.secondary, c.background, c.text].map((col, i) => (
            <span key={i} className="h-4 w-4 rounded border" style={{ backgroundColor: col }} />
          ))}
        </div>
        {selected ? (
          <span className="text-xs font-medium text-muted-foreground">Active design</span>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onActivate(option)}>
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Use this
          </Button>
        )}
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

  // Activate → optional “load into page editor” prompt
  const [activateTarget, setActivateTarget] = useState<ThemeDTO | null>(null);
  const [applyToEditor, setApplyToEditor] = useState(true);
  const [openEditorAfter, setOpenEditorAfter] = useState(true);

  // Import (JSON theme package)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  // The design style picked during onboarding (one of the 8 wizard themes).
  const [onboardingTheme, setOnboardingTheme] = useState<WizardThemeId | ''>('');
  const [onboardingBusy, setOnboardingBusy] = useState<WizardThemeId | null>(null);

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

  const loadOnboardingTheme = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/onboarding/preferences'), { credentials: 'include' });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data?.theme) setOnboardingTheme(json.data.theme as WizardThemeId);
    } catch {
      // Non-critical — the onboarding section just won't show a selection.
    }
  }, []);

  useEffect(() => { load(); loadOnboardingTheme(); }, [load, loadOnboardingTheme]);

  // Activate the system theme behind an onboarding design style and remember the pick.
  const activateOnboardingTheme = async (option: ThemeOption) => {
    const slug = WIZARD_THEME_TO_SLUG[option.id];
    const target = themes.find((t) => t.slug === slug);
    if (!target) { toast.error(`Theme "${option.label}" is not available yet.`); return; }
    setOnboardingBusy(option.id);
    setActivateTarget(target);
    setApplyToEditor(true);
    setOpenEditorAfter(false);
  };

  const openActivateDialog = (id: string) => {
    const target = themes.find((t) => t._id === id);
    if (!target) return;
    setActivateTarget(target);
    setApplyToEditor(true);
    setOpenEditorAfter(true);
  };

  const confirmActivate = async () => {
    if (!activateTarget) return;
    const id = activateTarget._id;
    const wantEditor = applyToEditor;
    const wantOpen = openEditorAfter && wantEditor;
    setBusyId(id);
    try {
      const result = await themeApi.activate(id, { applyToEditor: wantEditor });
      if (activateTarget.slug && THEME_OPTIONS.some((o) => WIZARD_THEME_TO_SLUG[o.id] === activateTarget.slug)) {
        const wizardId = THEME_OPTIONS.find((o) => WIZARD_THEME_TO_SLUG[o.id] === activateTarget.slug)?.id;
        if (wizardId) {
          await fetch(apiUrl('/api/onboarding/preferences'), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ theme: wizardId }),
          }).catch(() => null);
          setOnboardingTheme(wizardId);
        }
      }
      setActivateTarget(null);
      setOnboardingBusy(null);
      if (wantEditor) {
        toast.success(
          result.appliedToEditor?.blockCount
            ? `Theme activated — ${result.appliedToEditor.blockCount} sections loaded into the page editor`
            : 'Theme activated — layout applied to the page editor'
        );
        if (wantOpen && result.appliedToEditor?.slug) {
          const slug = result.appliedToEditor.slug;
          const pageId = result.appliedToEditor.pageId;
          window.open(
            `/Editor?pagename=${encodeURIComponent(slug)}${pageId ? `&pageId=${encodeURIComponent(pageId)}` : ''}&pageType=page`,
            '_blank',
            'noopener'
          );
        }
      } else {
        toast.success('Theme activated — live site updated (page editor unchanged)');
      }
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      setOnboardingBusy(null);
    }
  };

  const activate = async (id: string) => {
    openActivateDialog(id);
  };

  const toggleApplyPageLayout = async (id: string, applyPageLayout: boolean) => {
    setBusyId(id);
    try {
      await themeApi.setApplyPageLayout(id, applyPageLayout);
      setThemes((prev) => prev.map((t) => (t._id === id ? { ...t, applyPageLayout } : t)));
      toast.success(
        applyPageLayout
          ? 'Preference saved — use Activate to choose loading into the page editor'
          : 'Preference saved — Activate will only change live-site styling unless you opt in'
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const applyLayoutNow = async (id: string) => {
    if (
      !confirm(
        'Replace your homepage sections with this theme’s layout? Header/footer chrome may update too. This cannot be undone easily.'
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      const result = await themeApi.applyLayout(id, { applyPageLayout: true });
      const chromeBits = [
        result.header && result.header !== 'skipped' ? `header ${result.header}` : null,
        result.footer && result.footer !== 'skipped' ? `footer ${result.footer}` : null,
      ].filter(Boolean);
      toast.success(
        [
          result.blockCount
            ? `Applied ${result.blockCount} sections to /${result.slug || 'homepage'}`
            : 'Homepage body unchanged',
          chromeBits.length ? chromeBits.join(', ') : null,
        ]
          .filter(Boolean)
          .join(' · ')
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
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

  // Import / upload a theme file:
  //   • .json  → token package (POST /api/themes/import)
  //   • .zip   → full theme package manager path (POST /api/themes/upload),
  //              which also accepts token-only ZIPs (theme.json + optional preview)
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setImporting(true);
    try {
      const isZip = /\.zip$/i.test(file.name);
      let created;
      if (isZip) {
        created = await themeApi.uploadPackage(file);
      } else {
        let parsed: unknown;
        try {
          parsed = JSON.parse(await file.text());
        } catch {
          throw new Error(
            'That file isn’t valid JSON. Upload a .json token file or a .zip theme package.'
          );
        }
        created = await themeApi.importTheme(parsed);
      }
      toast.success(
        created.layouts && Object.keys(created.layouts).length > 0
          ? `Uploaded “${created.name}” with ${Object.keys(created.layouts).length} layout(s) — activate it to go live`
          : `Uploaded “${created.name}” — activate it to go live`
      );
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  // Download a valid starter token package (defaults pre-filled) to edit + re-import.
  const downloadTemplate = () => {
    const template = {
      format: 'nextcms-theme',
      version: 1,
      name: 'My Custom Theme',
      description: 'Describe your theme here',
      theme: DEFAULT_THEME_CONFIG,
      componentVariants: {
        navbar: 'default',
        hero: 'main',
        features: 'trio',
        testimonials: 'main',
        footer: 'default',
      },
    };
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-template.json';
    a.click();
    URL.revokeObjectURL(url);
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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.zip,application/zip"
            className="hidden"
            onChange={onImportFile}
          />
          <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload
          </Button>
          <Button variant="ghost" size="icon" title="Theme file format & template" onClick={() => setShowFormat(true)}>
            <FileJson className="h-4 w-4" />
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
              <Button
                variant="secondary"
                size="sm"
                disabled={busyId === active._id}
                onClick={() => applyLayoutNow(active._id)}
              >
                {busyId === active._id ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <LayoutTemplate className="mr-1.5 h-4 w-4" />
                )}
                Apply layout to homepage
              </Button>
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

      {/* Onboarding / starter design styles */}
      <div className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5" /> Starter Designs
          </h2>
          <p className="text-sm text-muted-foreground">
            The design styles from your setup wizard. The one you picked is highlighted —
            choose another any time to re-skin your site.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {THEME_OPTIONS.map((opt) => (
            <OnboardingThemeCard
              key={opt.id}
              option={opt}
              selected={onboardingTheme === opt.id}
              busy={onboardingBusy === opt.id}
              onActivate={activateOnboardingTheme}
            />
          ))}
        </div>
      </div>

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

                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/30 p-2 text-xs leading-snug">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!t.applyPageLayout}
                      disabled={busy || !!t.isSystemTheme}
                      onChange={(e) => toggleApplyPageLayout(t._id, e.target.checked)}
                    />
                    <span>
                      <span className="font-medium text-foreground">Match homepage layout</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        Use this theme’s section order &amp; presets on the live homepage when activated.
                      </span>
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!t.isActive && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => activate(t._id)}>
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Activate
                      </Button>
                    )}
                    {t.isActive && (
                      <Button size="sm" variant="default" disabled={busy} onClick={() => applyLayoutNow(t._id)}>
                        {busy ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LayoutTemplate className="mr-1 h-3.5 w-3.5" />
                        )}
                        Apply layout to homepage
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

      {/* Theme file format & template */}
      <Dialog open={showFormat} onOpenChange={setShowFormat}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Theme file format
            </DialogTitle>
          </DialogHeader>
          <div className="-mr-2 max-h-[60vh] space-y-5 overflow-y-auto pr-2 text-sm">
            <p className="text-muted-foreground">
              Themes are <b>not</b> code. Upload design tokens (and optionally assets) as
              JSON or ZIP. Files land as an <b>inactive</b> custom theme — activate to go live.
            </p>

            <div>
              <p className="mb-1.5 font-medium">1. Token package — <code>.json</code> (Import)</p>
              <p className="mb-1.5 text-muted-foreground">
                Lightweight design tokens only. Every field inside <code>theme</code> is optional.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
{`{
  "format": "nextcms-theme",
  "version": 1,
  "name": "Ocean Breeze",
  "description": "Cool, airy blue theme",
  "theme": {
    "colors": {
      "primary": "#0ea5e9",
      "secondary": "#7c3aed",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "surface": "#f8fafc",
      "text": "#111827",
      "muted": "#6b7280"
    },
    "typography": {
      "displayFont": "Sora, system-ui, sans-serif",
      "headingFont": "Poppins, system-ui, sans-serif",
      "bodyFont": "Inter, system-ui, sans-serif",
      "baseFontSize": "16px",
      "lineHeight": "1.6"
    },
    "spacing": { "xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "40px" },
    "radius":  { "sm": "4px", "md": "8px", "lg": "16px", "xl": "24px", "2xl": "32px" },
    "shadows": { "sm": "…", "md": "…", "lg": "…", "xl": "…" },
    "layout":  { "containerWidth": "1200px", "sectionSpacing": "80px" }
  },
  "componentVariants": {
    "navbar": "default",
    "hero": "split",
    "features": "bento",
    "testimonials": "main",
    "footer": "default"
  }
}`}
              </pre>
            </div>

            <div>
              <p className="mb-1.5 font-medium">2. Full theme package — <code>.zip</code> (Upload)</p>
              <p className="mb-1.5 text-muted-foreground">
                Tokens, templates, layouts, presets, CSS, fonts, and images. A single wrapping
                folder is optional. Sample: <code>examples/business-theme/</code>.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
{`business-theme.zip
└── business-theme/
    ├── theme.json              (required metadata)
    ├── preview.png             (optional gallery preview)
    ├── thumbnail.jpg           (optional)
    ├── tokens/
    │   ├── colors.json
    │   ├── typography.json
    │   ├── spacing.json
    │   ├── radius.json
    │   ├── shadows.json
    │   └── layout.json
    ├── templates/
    │   ├── header.json
    │   └── footer.json
    ├── layouts/default.json
    ├── blocks/hero.json
    ├── presets/buttons.json
    ├── css/
    ├── fonts/
    ├── images/
    └── assets/`}
              </pre>
            </div>

            <div>
              <p className="mb-1.5 font-medium">3. Package <code>theme.json</code> metadata</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
{`{
  "name": "Business Theme",
  "slug": "business-theme",
  "version": "1.0.0",
  "author": "OpenNext",
  "description": "Professional Business Theme",
  "preview": "preview.png",
  "thumbnail": "thumbnail.jpg",
  "compatibleCms": "^1.0.0",
  "supports": ["dark-mode", "responsive", "ai-builder", "block-presets"],
  "componentVariants": { "hero": "split", "features": "bento" }
}`}
              </pre>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Colors: hex, <code>rgb()/hsl()</code>, or <code>var(--…)</code>.</li>
              <li>Sizes: any CSS length (<code>16px</code>, <code>1.5rem</code>, …).</li>
              <li>
                <code>.json</code> ≤ <b>512&nbsp;KB</b> · light token ZIP via import ≤ <b>5&nbsp;MB</b> ·
                full package ZIP ≤ <b>25&nbsp;MB</b>.
              </li>
              <li>Dashboard <b>Upload</b> sends <code>.json</code> to token import and <code>.zip</code> to package upload.</li>
              <li>Spec: <code>docs/theme-upload-format.md</code>.</li>
            </ul>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download starter template
            </Button>
            <Button
              onClick={() => {
                setShowFormat(false);
                fileInputRef.current?.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" /> Choose file to upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate — optional page-editor load */}
      <Dialog
        open={!!activateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setActivateTarget(null);
            setOnboardingBusy(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Activate “{activateTarget?.name}”
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This will make <b>{activateTarget?.name}</b> the live site theme.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={applyToEditor}
                onChange={(e) => setApplyToEditor(e.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">
                  Also load this theme into the page editor
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Replace the homepage sections with this theme’s layout so you can edit
                  blocks, text, and images in the editor.
                </span>
              </span>
            </label>
            {applyToEditor ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={openEditorAfter}
                  onChange={(e) => setOpenEditorAfter(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-foreground">Open the page editor after activating</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Jump straight into the homepage canvas to customize the theme.
                  </span>
                </span>
              </label>
            ) : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setActivateTarget(null);
                  setOnboardingBusy(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!!busyId}
                onClick={confirmActivate}
              >
                {busyId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Activate{applyToEditor ? ' & load editor' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                  <PreviewCanvas
                    config={mergeThemeConfig(previewTheme.theme)}
                    componentVariants={previewTheme.componentVariants || {}}
                    layoutSections={
                      Array.isArray(
                        (previewTheme.layouts?.default as { sections?: string[] } | undefined)?.sections
                      )
                        ? (previewTheme.layouts!.default as { sections: string[] }).sections
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
