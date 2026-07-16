'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UploadCloud, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface EngineThemeRow {
  slug: string;
  name: string;
  author: string;
  version: string;
  status: 'installed' | 'installing' | 'failed' | 'disabled';
  installedAt: string;
}

interface ListResponse {
  activeSlug: string | null;
  themes: EngineThemeRow[];
}

interface PreviewStatus {
  active: boolean;
  slug: string | null;
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.error) {
    const message = json?.error?.message || `Request failed (${res.status})`;
    const fields = json?.error?.fields as Record<string, string> | undefined;
    const detail = fields ? ' — ' + Object.entries(fields).map(([f, m]) => `${f}: ${m}`).join('; ') : '';
    throw new Error(message + detail);
  }
  return json.data as T;
}

/**
 * Minimal admin UI for the NEW Theme Engine (spec-driven, .tsx package
 * format) — separate from the old /dashboard/themes/allthemes upload button,
 * which talks to a different, incompatible package format.
 *
 * Preview note: only `/<slug>` pages render through the new engine so far —
 * the site root `/` still goes through the old, unrelated homepage pipeline.
 * Pick a real page slug (e.g. "about") to preview against.
 */
export default function ThemeEnginePage() {
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null);
  const [previewingSlug, setPreviewingSlug] = useState<string | null>(null);
  const [previewPageSlug, setPreviewPageSlug] = useState('home');
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [themes, preview] = await Promise.all([
        unwrap<ListResponse>(await fetch('/api/theme-engine/themes')),
        unwrap<PreviewStatus>(await fetch('/api/theme-engine/preview')),
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

  const handleUpload = async () => {
    if (!file) {
      toast.error('Choose a .zip file first.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('replace', String(replace));
      const data = await unwrap<{ slug: string; version: string; status: string }>(
        await fetch('/api/theme-engine/themes/upload', { method: 'POST', body: form })
      );
      toast.success(`Installed ${data.slug}@${data.version}`);
      setFile(null);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleActivate = async (slug: string) => {
    setActivatingSlug(slug);
    try {
      await unwrap(await fetch(`/api/theme-engine/themes/${slug}/activate`, { method: 'POST' }));
      toast.success(`Activated ${slug}`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActivatingSlug(null);
    }
  };

  const handlePreview = async (slug: string) => {
    if (!previewPageSlug.trim()) {
      toast.error('Enter a page slug to preview (e.g. "about").');
      return;
    }
    setPreviewingSlug(slug);
    try {
      await unwrap(await fetch(`/api/theme-engine/themes/${slug}/preview`, { method: 'POST' }));
      await refresh();
      window.open(`/${previewPageSlug.trim().replace(/^\//, '')}`, '_blank', 'noopener');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPreviewingSlug(null);
    }
  };

  const handleExitPreview = async () => {
    try {
      await unwrap(await fetch('/api/theme-engine/preview', { method: 'DELETE' }));
      toast.success('Preview ended.');
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Theme Engine (Beta)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload and activate `.tsx`-based theme packages through the new engine. This is separate from the ZIP
          uploader under &ldquo;All Themes&rdquo;, which uses an older, incompatible package format.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a theme package</CardTitle>
          <CardDescription>A .zip containing theme.json + templates/partials/blocks as .tsx source.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-secondary file:text-secondary-foreground"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Replace an existing install at the same slug (upgrade)
          </label>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            Upload &amp; Install
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Preview a theme against a real page without activating it — opens in a new tab with a banner, and never
            affects what other visitors see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Page to preview:</span>
            <span className="text-sm text-muted-foreground">/</span>
            <Input
              value={previewPageSlug}
              onChange={(e) => setPreviewPageSlug(e.target.value)}
              placeholder="about"
              className="max-w-[200px]"
            />
          </div>
          {previewStatus?.active ? (
            <div className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4" /> Currently previewing <strong>{previewStatus.slug}</strong>
              </span>
              <Button size="sm" variant="outline" onClick={handleExitPreview}>
                <EyeOff className="h-4 w-4 mr-1" /> Exit Preview
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No preview session active. Click &ldquo;Preview&rdquo; on any theme below.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Installed themes</CardTitle>
          <CardDescription>{list?.activeSlug ? `Active: ${list.activeSlug}` : 'No theme is currently active.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !list?.themes.length ? (
            <p className="text-sm text-muted-foreground">No themes installed yet.</p>
          ) : (
            <div className="divide-y">
              {list.themes.map((t) => {
                const isActive = t.slug === list.activeSlug;
                return (
                  <div key={t.slug} className="flex items-center justify-between py-3 gap-3">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {t.name}
                        <span className="text-xs text-muted-foreground">v{t.version}</span>
                        <Badge variant={t.status === 'installed' ? 'default' : 'destructive'}>{t.status}</Badge>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.slug} · by {t.author}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={t.status !== 'installed' || previewingSlug === t.slug}
                        onClick={() => handlePreview(t.slug)}
                      >
                        {previewingSlug === t.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={t.status !== 'installed' || activatingSlug === t.slug}
                          onClick={() => handleActivate(t.slug)}
                        >
                          {activatingSlug === t.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activate'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
