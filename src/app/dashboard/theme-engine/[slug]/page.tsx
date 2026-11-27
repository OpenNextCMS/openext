'use client';
import { apiUrl } from '@/lib/apiClient';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Eye,
  Layers,
  Loader2,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ThemeDetail {
  slug: string;
  name: string;
  author: string;
  version: string;
  description: string;
  status: string;
  isActive: boolean;
  templateCount: number;
  templates: { key: string; name: string; file: string; type: string }[];
  partials: Record<string, string>;
  blocks: { type: string; rendererPath: string }[];
  assets: { css?: string; js?: string };
  screenshotUrl?: string;
  blockCount?: number;
  partialCount?: number;
  supports?: Record<string, boolean>;
  installedAt: string;
  updatedAt: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json?.error?.message || `Request failed (${res.status})`);
  return json.data as T;
}

export default function ThemeDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? '');
  const [detail, setDetail] = useState<ThemeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewTemplateKey, setPreviewTemplateKey] = useState('home');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unwrap<ThemeDetail>(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}`))
      );
      setDetail(data);
      const preferred =
        data.templates.find((t) => t.key === 'home')?.key ??
        data.templates.find((t) => t.key === 'index')?.key ??
        data.templates[0]?.key ??
        'home';
      setPreviewTemplateKey(preferred);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const activate = async () => {
    setBusy(true);
    try {
      await unwrap(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/activate`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applyToEditor: false }),
        })
      );
      toast.success(`Activated “${slug}”.`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    setBusy(true);
    try {
      await unwrap(
        await fetch(apiUrl(`/api/theme-engine/themes/${encodeURIComponent(slug)}/preview`), {
          method: 'POST',
        })
      );
      window.open('/', '_blank', 'noopener');
      toast.success('Preview session started — browse your site with this theme.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Theme not found.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link href="/dashboard/theme-engine">Back to gallery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/theme-engine">
            <ArrowLeft className="mr-2 h-4 w-4" /> Gallery
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Palette className="h-6 w-6" /> {detail.name}
            {detail.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <Check className="h-3 w-3" /> Active
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            v{detail.version} · by {detail.author} · {detail.templateCount} templates
            {typeof detail.blockCount === 'number' && detail.blockCount > 0
              ? ` · ${detail.blockCount} blocks`
              : ''}
            {typeof detail.partialCount === 'number' && detail.partialCount > 0
              ? ` · ${detail.partialCount} partials`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={preview}>
            <Eye className="mr-2 h-4 w-4" /> Live Preview
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/theme-engine/customize/${encodeURIComponent(slug)}`}>
              <Palette className="mr-2 h-4 w-4" /> Customize
            </Link>
          </Button>
          {!detail.isActive && (
            <Button disabled={busy} onClick={activate}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activate
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={`/dashboard/theme-engine/${encodeURIComponent(slug)}/templates`}>
              <Layers className="mr-2 h-4 w-4" /> Templates
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {detail.templates.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">Preview template</span>
            <Select value={previewTemplateKey} onValueChange={setPreviewTemplateKey}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {detail.templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name} ({t.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border bg-neutral-900">
          <iframe
            key={`${slug}-${previewTemplateKey}`}
            src={`/theme-engine-card-preview/${encodeURIComponent(slug)}?compose=1&template=${encodeURIComponent(previewTemplateKey)}`}
            title={`${detail.name} — ${previewTemplateKey}`}
            className="h-64 w-full border-0 md:h-80"
          />
        </div>
      </div>

      {detail.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{detail.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
            <CardDescription>{detail.templates.length} registered</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {detail.templates.map((t) => (
                <li key={t.key} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={`text-left hover:underline ${previewTemplateKey === t.key ? 'font-semibold text-primary' : ''}`}
                    onClick={() => setPreviewTemplateKey(t.key)}
                  >
                    {t.name}
                  </button>
                  <span className="text-muted-foreground">{t.key}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partials</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(detail.partials).length === 0 ? (
              <p className="text-sm text-muted-foreground">None declared</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {Object.entries(detail.partials).map(([key, file]) => (
                  <li key={key}>
                    <span className="font-medium">{key}</span>
                    <span className="text-muted-foreground"> — {file}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Blocks</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">None declared</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.blocks.map((b) => (
                  <li key={b.type}>{b.type}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {detail.assets.css && <p>CSS: {detail.assets.css}</p>}
          {detail.assets.js && <p>JS: {detail.assets.js}</p>}
          {!detail.assets.css && !detail.assets.js && <p>No assets declared</p>}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Installed {new Date(detail.installedAt).toLocaleString()}
        {detail.updatedAt ? ` · Updated ${new Date(detail.updatedAt).toLocaleString()}` : ''}
      </p>
    </div>
  );
}
