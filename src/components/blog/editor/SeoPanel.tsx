'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react';
import type { BlogSeo } from '@/types/index';
import type { EditorPost } from './types';
import { useAi } from '@/lib/ai/useAi';

interface Props {
  post: EditorPost;
  onChange: (seo: BlogSeo) => void;
  siteUrl?: string;
}

/** A single pass/fail row for the focus-keyword usage checklist. */
function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={ok ? '' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

export default function SeoPanel({ post, onChange, siteUrl = '' }: Props) {
  const seo = post.seo || {};
  const focusKeyword = (seo.keywords?.[0] ?? '').trim();

  const { loading, run } = useAi();
  const set = (patch: Partial<BlogSeo>) => onChange({ ...seo, ...patch });
  const setFocusKeyword = (kw: string) => {
    const rest = (seo.keywords ?? []).slice(1);
    set({ keywords: kw ? [kw, ...rest] : rest });
  };

  const generateTitle = async () => {
    const res = await run<{ title: string }>('generate-seo-title', {
      title: post.pageName || 'Untitled',
      keyword: focusKeyword,
    });
    if (res?.title) set({ title: res.title });
  };

  const generateDescription = async () => {
    const body = `${post.excerpt}\n${JSON.stringify(post.contentBlocks || [])}`.slice(0, 6000);
    const res = await run<{ description: string }>('generate-meta-description', {
      title: post.pageName || 'Untitled',
      body,
    });
    if (res?.description) set({ description: res.description });
  };

  const title = seo.title || post.pageName || 'Untitled post';
  const description = seo.description || post.excerpt || '';
  const url = `${siteUrl.replace(/\/$/, '')}/${post.slug || 'post-slug'}`;

  // Focus-keyword usage checks.
  const kw = focusKeyword.toLowerCase();
  const has = (s: string | undefined) => !!kw && !!s && s.toLowerCase().includes(kw);
  const contentHaystack = JSON.stringify(post.contentBlocks || []).toLowerCase();
  const checks = focusKeyword
    ? [
        { ok: has(seo.title || post.pageName), label: 'Keyword in SEO title' },
        { ok: has(seo.description || post.excerpt), label: 'Keyword in meta description' },
        { ok: has(post.slug), label: 'Keyword in slug' },
        { ok: !!kw && contentHaystack.includes(kw), label: 'Keyword in content' },
      ]
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Meta title</Label>
            <Button type="button" variant="ghost" size="sm" onClick={generateTitle} disabled={!!loading}>
              {loading === 'generate-seo-title' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              AI
            </Button>
          </div>
          <Input
            value={seo.title ?? ''}
            onChange={(e) => set({ title: e.target.value })}
            placeholder={post.pageName || 'Defaults to post title'}
          />
          <p className="text-xs text-muted-foreground">{(seo.title ?? '').length}/60 characters</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Meta description</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generateDescription}
              disabled={!!loading}
            >
              {loading === 'generate-meta-description' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              AI
            </Button>
          </div>
          <Textarea
            rows={3}
            value={seo.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
            placeholder={post.excerpt || 'Defaults to excerpt'}
          />
          <p className="text-xs text-muted-foreground">
            {(seo.description ?? '').length}/155 characters
          </p>
        </div>

        <div className="space-y-1">
          <Label>Focus keyword</Label>
          <Input value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} />
        </div>

        <div className="space-y-1">
          <Label>Canonical URL</Label>
          <Input
            value={seo.canonical ?? ''}
            onChange={(e) => set({ canonical: e.target.value })}
            placeholder={url}
          />
        </div>

        <div className="space-y-1">
          <Label>Social / OG image URL</Label>
          <Input
            value={seo.ogImage ?? ''}
            onChange={(e) => set({ ogImage: e.target.value })}
            placeholder={post.featuredImage || 'https://…'}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label>Allow indexing</Label>
            <p className="text-xs text-muted-foreground">Let search engines index this post.</p>
          </div>
          <Switch
            checked={seo.index !== false}
            onCheckedChange={(checked) => set({ index: checked })}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Google preview */}
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Google preview</Label>
          <div className="rounded-lg border p-4">
            <p className="truncate text-xs text-green-700">{url}</p>
            <p className="truncate text-lg text-blue-800">{title}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {description || 'Add a meta description to control this snippet.'}
            </p>
          </div>
        </div>

        {/* Twitter / X card */}
        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Twitter / X card</Label>
          <div className="overflow-hidden rounded-xl border">
            {(seo.ogImage || post.featuredImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seo.ogImage || post.featuredImage}
                alt="Card preview"
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                No image
              </div>
            )}
            <div className="space-y-1 p-3">
              <p className="truncate font-semibold">{title}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground">{url}</p>
            </div>
          </div>
        </div>

        {/* Focus keyword checks */}
        {focusKeyword ? (
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Focus keyword usage</Label>
            <ul className="space-y-1 rounded-lg border p-3">
              {checks.map((c) => (
                <CheckRow key={c.label} ok={c.ok} label={c.label} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
