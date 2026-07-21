'use client';
import { apiUrl } from '@/lib/apiClient';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileJson,
  LayoutGrid,
  Loader2,
  Palette,
  Search,
  Sparkles,
  Upload,
  AlertTriangle,
  Monitor,
  Tablet,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

/* ──────────────────────────────────────────────────────────────────────────
 * Theme Engine (Beta) gallery — same visual language as All Themes, wired to
 * the .tsx package engine APIs (upload / activate / preview sessions).
 * ────────────────────────────────────────────────────────────────────────── */

interface EngineThemeRow {
  slug: string;
  name: string;
  author: string;
  version: string;
  description?: string;
  status: 'installed' | 'installing' | 'failed' | 'disabled';
  installedAt: string;
  updatedAt?: string;
}

interface ListResponse {
  activeSlug: string | null;
  themes: EngineThemeRow[];
}

interface PreviewStatus {
  active: boolean;
  slug: string | null;
}

type SortKey = 'updated' | 'name' | 'status';

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.error) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    const fields = json?.error?.fields as Record<string, string> | undefined;
    const detail = fields
      ? ' — ' + Object.entries(fields).map(([f, m]) => `${f}: ${m}`).join('; ')
      : '';
    throw new Error(message + detail);
  }
  return json.data as T;
}

/** Deterministic accent palette from a slug — used for banner/details accents only. */
function paletteFromSlug(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  const hues = [210, 250, 160, 20, 330, 185, 280, 45];
  const hue = hues[hash % hues.length];
  return {
    primary: `hsl(${hue} 72% 48%)`,
    secondary: `hsl(${(hue + 40) % 360} 55% 42%)`,
    accent: `hsl(${(hue + 160) % 360} 70% 45%)`,
    background: '#ffffff',
    surface: `hsl(${hue} 30% 97%)`,
    text: '#111827',
    muted: '#6b7280',
  };
}

/** Live scaled iframe of the real theme render (not a schematic mockup). */
function ThemeCardLivePreview({
  slug,
  name,
  status,
  tall = false,
}: {
  slug: string;
  name: string;
  status: EngineThemeRow['status'];
  tall?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const heightClass = tall ? 'h-[420px]' : 'h-44';
  // Gallery cards use compose=1 so header + footer stay pinned in the frame.
  const previewSrc = `/theme-engine-card-preview/${encodeURIComponent(slug)}${
    tall ? '' : '?compose=1'
  }`;

  if (status !== 'installed' || failed) {
    return (
      <div className={`flex ${heightClass} items-center justify-center bg-muted/40 px-4 text-center text-xs text-muted-foreground`}>
        {status !== 'installed'
          ? `Preview unavailable (${status})`
          : 'Could not load theme preview'}
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden bg-neutral-900`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        src={previewSrc}
        title={`${name} preview`}
        className="pointer-events-none absolute left-0 top-0 border-0"
        style={
          tall
            ? {
                width: '100%',
                height: '100%',
              }
            : {
                width: '400%',
                height: '400%',
                transform: 'scale(0.25)',
                transformOrigin: 'top left',
              }
        }
        loading="lazy"
        sandbox="allow-same-origin allow-scripts"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function ThemeEnginePage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [activateTarget, setActivateTarget] = useState<EngineThemeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EngineThemeRow | null>(null);
  const [applyToEditor, setApplyToEditor] = useState(true);
  const [openEditorAfter, setOpenEditorAfter] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [replace, setReplace] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  const [previewStatus, setPreviewStatus] = useState<PreviewStatus | null>(null);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewing, setPreviewing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [themes, preview] = await Promise.all([
        unwrap<ListResponse>(await fetch(apiUrl('/api/theme-engine/themes'))),
        unwrap<PreviewStatus>(await fetch(apiUrl('/api/theme-engine/preview'))),
      ]);
      setList(themes);
      setPreviewStatus(preview);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const themes = useMemo(() => list?.themes ?? [], [list?.themes]);
  const active = themes.find((t) => t.slug === list?.activeSlug);

  const installedCount = themes.filter((t) => t.status === 'installed').length;
  const failedCount = themes.filter((t) => t.status === 'failed').length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = themes.filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q)
    );
    const rank = (t: EngineThemeRow) =>
      t.slug === list?.activeSlug ? 0 : t.status === 'failed' ? 3 : t.status === 'installed' ? 1 : 2;
    const sorters: Record<SortKey, (a: EngineThemeRow, b: EngineThemeRow) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      updated: (a, b) =>
        new Date(b.updatedAt || b.installedAt || 0).getTime() -
        new Date(a.updatedAt || a.installedAt || 0).getTime(),
      status: (a, b) => rank(a) - rank(b),
    };
    return [...filtered].sort(sorters[sort]);
  }, [themes, query, sort, list?.activeSlug]);

  const onUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const uploadOnce = async (withReplace: boolean) => {
        const form = new FormData();
        form.append('file', file);
        form.append('replace', String(withReplace));
        return unwrap<{ slug: string; version: string; status: string }>(
          await fetch(apiUrl('/api/theme-engine/themes/upload'), { method: 'POST', body: form })
        );
      };

      let data: { slug: string; version: string; status: string };
      try {
        data = await uploadOnce(replace);
      } catch (err) {
        const message = (err as Error).message || '';
        const alreadyInstalled = /already installed/i.test(message) && /replace/i.test(message);
        if (!alreadyInstalled || replace) throw err;

        const ok = window.confirm(
          `${message}\n\nReplace the existing theme package with this upload?`
        );
        if (!ok) throw err;
        setReplace(true);
        data = await uploadOnce(true);
      }

      toast.success(`Uploaded “${data.slug}” v${data.version} — activate it to go live`);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleActivate = async (slug: string) => {
    const target = themes.find((t) => t.slug === slug);
    if (!target) return;
    setActivateTarget(target);
    setApplyToEditor(true);
    setOpenEditorAfter(true);
  };

  const confirmActivate = async () => {
    if (!activateTarget) return;
    const slug = activateTarget.slug;
    const wantEditor = applyToEditor;
    const wantOpen = openEditorAfter && wantEditor;
    setBusySlug(slug);
    try {
      const result = await unwrap<{
        activatedSlug: string;
        appliedToEditor?: {
          pageId: string;
          slug: string;
          blockCount: number;
          mode?: string;
          hasEditableSections?: boolean;
        } | null;
      }>(
        await fetch(apiUrl(`/api/theme-engine/themes/${slug}/activate`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applyToEditor: wantEditor, editorMode: 'exact-editable' }),
        })
      );
      setActivateTarget(null);
      if (wantEditor && result.appliedToEditor) {
        toast.success(
          result.appliedToEditor.hasEditableSections
            ? `Activated “${slug}” — exact theme loaded with editable sections`
            : `Activated “${slug}” — exact theme loaded onto the homepage canvas`
        );
        if (wantOpen) {
          const pageSlug = result.appliedToEditor.slug;
          const pageId = result.appliedToEditor.pageId;
          // Bust any stale editor draft so the new blocks load from the server.
          try {
            localStorage.removeItem(`persist:root-${pageSlug}`);
          } catch {
            // ignore
          }
          window.open(
            `/Editor?pagename=${encodeURIComponent(pageSlug)}${
              pageId ? `&pageId=${encodeURIComponent(pageId)}` : ''
            }&pageType=page`,
            '_blank',
            'noopener'
          );
        }
      } else {
        toast.success(`Activated “${slug}” — your live site now uses this engine theme`);
      }
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusySlug(null);
    }
  };

  const handleDelete = (slug: string) => {
    const target = themes.find((t) => t.slug === slug);
    if (!target) return;
    setDeleteTarget(target);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const slug = deleteTarget.slug;
    setBusySlug(slug);
    try {
      await unwrap(await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}`), { method: 'DELETE' }));
      setDeleteTarget(null);
      if (previewSlug === slug) setPreviewSlug(null);
      if (expanded === slug) setExpanded(null);
      toast.success(`Deleted “${deleteTarget.name}”`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusySlug(null);
    }
  };

  const openPreviewSession = async (slug: string) => {
    setPreviewing(true);
    try {
      // Start a preview session (banner on public pages) and open a theme-only
      // snapshot — no CMS homepage blocks mixed into the package design.
      await unwrap(await fetch(apiUrl(`/api/theme-engine/themes/${slug}/preview`), { method: 'POST' }));
      await refresh();
      window.open(
        `/theme-engine-card-preview/${encodeURIComponent(slug)}`,
        '_blank',
        'noopener'
      );
      toast.success(`Previewing “${slug}” (theme only)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleExitPreview = async () => {
    try {
      await unwrap(await fetch(apiUrl('/api/theme-engine/preview'), { method: 'DELETE' }));
      toast.success('Preview ended.');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const previewTheme = themes.find((t) => t.slug === previewSlug);
  const activePalette = paletteFromSlug(active?.slug || 'default');

  return (
    <div className="space-y-6 p-6">
      {/* Header — mirrors All Themes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6" /> Theme Engine
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Beta
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload and activate <b>.tsx</b> theme packages. The <b>active</b> engine theme drives
            public page rendering.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!active}
            onClick={() => {
              setPreviewSlug(active?.slug || null);
              setDevice('desktop');
            }}
          >
            <Eye className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={onUploadFile}
          />
          <Button
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}{' '}
            Upload
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Theme package format"
            onClick={() => setShowFormat(true)}
          >
            <FileJson className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={LayoutGrid}
          label="Total Themes"
          value={themes.length}
          tint="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          icon={Check}
          label="Active Theme"
          value={<span className="truncate text-base">{active?.name ?? '—'}</span>}
          tint="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          icon={Sparkles}
          label="Installed"
          value={installedCount}
          tint="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Failed"
          value={failedCount}
          tint="bg-rose-100 text-rose-600"
        />
      </div>

      {/* Active preview session banner */}
      {previewStatus?.active && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-amber-900">
            <Eye className="h-4 w-4" />
            Preview session active for <strong>{previewStatus.slug}</strong> — only you see it.
          </span>
          <Button size="sm" variant="outline" onClick={handleExitPreview}>
            <EyeOff className="mr-1.5 h-4 w-4" /> Exit Preview
          </Button>
        </div>
      )}

      {/* Active theme banner */}
      {active && (
        <div className="overflow-hidden rounded-xl border">
          <div
            className="flex flex-wrap items-end justify-between gap-4 p-6"
            style={{
              background: `linear-gradient(135deg, ${activePalette.primary}, ${activePalette.secondary})`,
            }}
          >
            <div className="text-white">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Active
              </span>
              <h2 className="mt-2 text-3xl font-bold drop-shadow">{active.name}</h2>
              <p className="text-sm opacity-90">
                v{active.version} · by {active.author} · Engine package
              </p>
              {active.description ? (
                <p className="mt-1 max-w-lg text-sm opacity-90">{active.description}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPreviewSlug(active.slug);
                  setDevice('desktop');
                }}
              >
                <Eye className="mr-1.5 h-4 w-4" /> Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground" title="Required when re-uploading an existing slug like breez">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Replace existing theme
        </label>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {query ? `No themes match “${query}”.` : 'No engine themes installed yet. Upload a .zip package to get started.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const busy = busySlug === t.slug;
            const isActive = t.slug === list?.activeSlug;
            const isOpen = expanded === t.slug;
            const swatches = paletteFromSlug(t.slug);
            return (
              <div key={t.slug} className="flex flex-col overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  className="block text-left"
                  onClick={() => {
                    setPreviewSlug(t.slug);
                    setDevice('desktop');
                  }}
                  title="Open live preview"
                >
                  <ThemeCardLivePreview slug={t.slug} name={t.name} status={t.status} />
                </button>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                    {t.status === 'installed' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                        <Sparkles className="h-3 w-3" /> Package
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        <AlertTriangle className="h-3 w-3" /> {t.status}
                      </span>
                    )}
                  </div>
                  {t.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                  ) : (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      by {t.author} · {t.slug}
                    </p>
                  )}
                  <p className="mt-auto text-xs text-muted-foreground">
                    v{t.version}
                    {t.installedAt
                      ? ` · Installed ${new Date(t.installedAt).toLocaleDateString()}`
                      : ''}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || t.status !== 'installed'}
                        onClick={() => handleActivate(t.slug)}
                      >
                        {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}{' '}
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={t.status !== 'installed'}
                      onClick={() => {
                        setPreviewSlug(t.slug);
                        setDevice('desktop');
                      }}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={
                        busy ||
                        isActive ||
                        t.slug === 'theme-engine-default'
                      }
                      title={
                        isActive
                          ? 'Activate another theme before deleting this one'
                          : t.slug === 'theme-engine-default'
                            ? 'Built-in default theme cannot be deleted'
                            : `Delete ${t.name}`
                      }
                      onClick={() => handleDelete(t.slug)}
                    >
                      {busy ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                      )}{' '}
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => setExpanded(isOpen ? null : t.slug)}
                    >
                      Details{' '}
                      <ChevronDown
                        className={`ml-1 h-3.5 w-3.5 transition ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-1 space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                      <div className="flex flex-wrap gap-1.5">
                        {(['primary', 'secondary', 'accent', 'background', 'surface', 'text'] as const).map(
                          (k) => (
                            <span
                              key={k}
                              title={k}
                              className="h-5 w-5 rounded border"
                              style={{ backgroundColor: swatches[k] }}
                            />
                          )
                        )}
                      </div>
                      <p>
                        <b>Slug:</b> {t.slug}
                      </p>
                      <p>
                        <b>Author:</b> {t.author}
                      </p>
                      <p>
                        <b>Status:</b> {t.status}
                      </p>
                      <p>
                        <b>Type:</b> Theme Engine package (.tsx)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package format dialog */}
      <Dialog open={showFormat} onOpenChange={setShowFormat}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" /> Theme Engine package format
            </DialogTitle>
          </DialogHeader>
          <div className="-mr-2 max-h-[60vh] space-y-5 overflow-y-auto pr-2 text-sm">
            <p className="text-muted-foreground">
              Engine themes are <b>.tsx</b> packages (templates, partials, blocks). Upload a{' '}
              <code>.zip</code> — it installs as inactive until you activate it.
            </p>
            <div>
              <p className="mb-1.5 font-medium">Required ZIP layout</p>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
{`my-theme.zip
└── my-theme/
    ├── theme.json              (required)
    ├── templates/
    │   └── index.tsx           (required fallback)
    ├── partials/
    │   ├── Header.tsx
    │   └── Footer.tsx
    ├── blocks/
    └── assets/`}
              </pre>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                This gallery is separate from <b>All Themes</b> (token / block packages).
              </li>
              <li>Enable <b>Replace on upload</b> to upgrade an existing slug.</li>
              <li>Preview opens a real page with a session banner — visitors are unaffected.</li>
            </ul>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
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

      {/* Activate — optional open page editor */}
      <Dialog open={!!activateTarget} onOpenChange={(o) => !o && setActivateTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Activate “{activateTarget?.name}”
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This will make <b>{activateTarget?.name}</b> the live Theme Engine theme for your public pages.
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
                  Also load this theme onto the page editor canvas
                </span>
                <span className="mt-0.5 block text-muted-foreground">
                  Renders the exact Theme Engine package on the homepage canvas. Themes that declare
                  editable sections also expose schema-driven content controls.
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
                  <span className="font-medium text-foreground">
                    Open the page editor after activating
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Jump straight into the homepage canvas with this theme loaded.
                  </span>
                </span>
              </label>
            ) : null}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setActivateTarget(null)}>
                Cancel
              </Button>
              <Button disabled={!!busySlug} onClick={confirmActivate}>
                {busySlug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Activate{applyToEditor ? ' & load canvas' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete theme */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete “{deleteTarget?.name}”?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This permanently removes <b>{deleteTarget?.name}</b> ({deleteTarget?.slug}) from Theme
              Engine — including its installed files. This cannot be undone. Re-upload the package
              later if you need it again.
            </p>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={!!busySlug} onClick={confirmDelete}>
                {busySlug ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete theme
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Preview drawer — same shell as All Themes */}
      <Dialog open={!!previewSlug} onOpenChange={(o) => !o && setPreviewSlug(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2">
                <Eye className="h-5 w-5" /> Live Preview
              </span>
              {previewTheme && (
                <Select value={previewSlug ?? ''} onValueChange={(v) => setPreviewSlug(v)}>
                  <SelectTrigger className="h-8 w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                        {t.slug === list?.activeSlug ? ' (active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
                {(['desktop', 'tablet', 'mobile'] as const).map((d) => {
                  const Icon = d === 'desktop' ? Monitor : d === 'tablet' ? Tablet : Smartphone;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDevice(d)}
                      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs capitalize ${
                        device === d ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {d}
                    </button>
                  );
                })}
              </div>
            </DialogTitle>
          </DialogHeader>
          {previewTheme && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Shows only this uploaded theme — no other page blocks.
                </p>
                <Button
                  disabled={previewing || previewTheme.status !== 'installed'}
                  onClick={() => openPreviewSession(previewTheme.slug)}
                >
                  {previewing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Open full preview
                </Button>
              </div>
              <div className="flex max-h-[70vh] justify-center overflow-auto rounded-xl bg-muted/30 p-4">
                <div
                  className={`${
                    device === 'desktop'
                      ? 'w-full'
                      : device === 'tablet'
                        ? 'w-[768px] max-w-full'
                        : 'w-[390px] max-w-full'
                  } transition-all`}
                >
                  <div className="overflow-hidden rounded-xl border bg-white">
                    <ThemeCardLivePreview
                      slug={previewTheme.slug}
                      name={previewTheme.name}
                      status={previewTheme.status}
                      tall
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
