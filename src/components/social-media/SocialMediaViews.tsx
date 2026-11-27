'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SOCIAL_PLATFORM_IDS,
  SOCIAL_PLATFORM_LABELS,
} from '@/lib/social-media/constants';
import { buildShareUrls } from '@/lib/social-media/shareUrls';
import type {
  ISocialMediaPost,
  ISocialMediaSettings,
  SocialPlatformId,
  SocialPostStatus,
} from '@/types/social-media';
import { socialMediaApi } from './api';
import { SocialPlatformIcon } from './SocialPlatformIcon';

function connectedCount(settings: ISocialMediaSettings | null): number {
  if (!settings) return 0;
  return SOCIAL_PLATFORM_IDS.filter((id) => {
    const p = settings.platforms[id];
    return p?.enabled && !!p.profileUrl?.trim();
  }).length;
}

export function SocialMediaOverview() {
  const [settings, setSettings] = useState<ISocialMediaSettings | null>(null);
  const [posts, setPosts] = useState<ISocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([socialMediaApi.getSettings(), socialMediaApi.listPosts()])
      .then(([s, p]) => {
        if (!active) return;
        setSettings(s);
        setPosts(p);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading overview…
      </div>
    );
  }

  const connected = connectedCount(settings);
  const drafts = posts.filter((p) => p.status === 'draft').length;
  const scheduled = posts.filter((p) => p.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Social Media Integration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect profiles, configure share buttons, and queue content for social platforms.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Connected profiles</p>
          <p className="mt-1 text-3xl font-semibold">{connected}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Draft posts</p>
          <p className="mt-1 text-3xl font-semibold">{drafts}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Scheduled</p>
          <p className="mt-1 text-3xl font-semibold">{scheduled}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/plugins/social-media/connections">
            <Link2 className="mr-2 h-4 w-4" /> Manage connections
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/plugins/social-media/share">
            <Share2 className="mr-2 h-4 w-4" /> Share settings
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/plugins/social-media/posts">
            <Plus className="mr-2 h-4 w-4" /> Post queue
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function SocialMediaConnections() {
  const [settings, setSettings] = useState<ISocialMediaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    socialMediaApi
      .getSettings()
      .then(setSettings)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const updatePlatform = (id: SocialPlatformId, patch: Partial<ISocialMediaSettings['platforms'][SocialPlatformId]>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        platforms: {
          ...prev.platforms,
          [id]: { ...prev.platforms[id], ...patch },
        },
      };
    });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await socialMediaApi.saveSettings({ platforms: settings.platforms });
      setSettings(next);
      toast.success('Connections saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading connections…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add public profile or page URLs for each platform. OAuth posting can be added later with
            platform app credentials.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <div className="space-y-4">
        {SOCIAL_PLATFORM_IDS.map((id) => {
          const cfg = settings.platforms[id];
          const connected = cfg.enabled && !!cfg.profileUrl.trim();
          return (
            <div key={id} className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SocialPlatformIcon platform={id} size={18} />
                  <h3 className="font-medium">{SOCIAL_PLATFORM_LABELS[id]}</h3>
                  {connected ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not connected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${id}`} className="text-sm text-muted-foreground">
                    Enabled
                  </Label>
                  <Switch
                    id={`enabled-${id}`}
                    checked={cfg.enabled}
                    onCheckedChange={(v) => updatePlatform(id, { enabled: v })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`url-${id}`}>Profile / page URL</Label>
                <Input
                  id={`url-${id}`}
                  placeholder={`https://…`}
                  value={cfg.profileUrl}
                  onChange={(e) => updatePlatform(id, { profileUrl: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SocialMediaShareSettings() {
  const [settings, setSettings] = useState<ISocialMediaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('https://example.com/blog/hello-world');
  const [previewTitle, setPreviewTitle] = useState('Hello World');

  useEffect(() => {
    socialMediaApi
      .getSettings()
      .then(setSettings)
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const previewLinks = useMemo(() => {
    if (!settings) return [];
    return buildShareUrls({
      url: previewUrl,
      title: previewTitle,
      settings,
    });
  }, [settings, previewUrl, previewTitle]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await socialMediaApi.saveSettings({
        platforms: settings.platforms,
        shareDefaults: settings.shareDefaults,
        openGraph: settings.openGraph,
      });
      setSettings(next);
      toast.success('Share settings saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading share settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Share settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which platforms appear on share buttons and set Open Graph defaults.
          </p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className="font-medium">Defaults</h2>
          <div className="flex items-center justify-between">
            <Label>Show on blogs</Label>
            <Switch
              checked={settings.shareDefaults.showOnBlogs}
              onCheckedChange={(v) =>
                setSettings({
                  ...settings,
                  shareDefaults: { ...settings.shareDefaults, showOnBlogs: v },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show on pages</Label>
            <Switch
              checked={settings.shareDefaults.showOnPages}
              onCheckedChange={(v) =>
                setSettings({
                  ...settings,
                  shareDefaults: { ...settings.shareDefaults, showOnPages: v },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Open in new tab</Label>
            <Switch
              checked={settings.shareDefaults.openInNewTab}
              onCheckedChange={(v) =>
                setSettings({
                  ...settings,
                  shareDefaults: { ...settings.shareDefaults, openInNewTab: v },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Button style</Label>
            <Select
              value={settings.shareDefaults.buttonStyle}
              onValueChange={(v) =>
                setSettings({
                  ...settings,
                  shareDefaults: {
                    ...settings.shareDefaults,
                    buttonStyle: v as ISocialMediaSettings['shareDefaults']['buttonStyle'],
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icon">Icon only</SelectItem>
                <SelectItem value="icon-label">Icon + label</SelectItem>
                <SelectItem value="label">Label only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <h2 className="pt-2 font-medium">Open Graph</h2>
          <div className="space-y-2">
            <Label>Site name</Label>
            <Input
              value={settings.openGraph.siteName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openGraph: { ...settings.openGraph, siteName: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Default image URL</Label>
            <Input
              value={settings.openGraph.defaultImage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openGraph: { ...settings.openGraph, defaultImage: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className="font-medium">Platforms in share bar</h2>
          {SOCIAL_PLATFORM_IDS.map((id) => (
            <div key={id} className="flex items-center justify-between">
              <Label>{SOCIAL_PLATFORM_LABELS[id]}</Label>
              <Switch
                checked={settings.platforms[id].shareEnabled}
                onCheckedChange={(v) =>
                  setSettings({
                    ...settings,
                    platforms: {
                      ...settings.platforms,
                      [id]: { ...settings.platforms[id], shareEnabled: v },
                    },
                  })
                }
              />
            </div>
          ))}

          <h2 className="pt-2 font-medium">Preview</h2>
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {previewLinks.map((item) => (
              <a
                key={item.platform}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                {item.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
            {previewLinks.length === 0 && (
              <p className="text-sm text-muted-foreground">No share links enabled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialMediaPosts() {
  const [posts, setPosts] = useState<ISocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [platforms, setPlatforms] = useState<SocialPlatformId[]>(['facebook', 'twitter', 'linkedin']);
  const [status, setStatus] = useState<SocialPostStatus>('draft');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await socialMediaApi.listPosts());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePlatform = (id: SocialPlatformId) => {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const create = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error('Title and URL are required');
      return;
    }
    setSaving(true);
    try {
      await socialMediaApi.createPost({ title, url, message, platforms, status });
      setTitle('');
      setUrl('');
      setMessage('');
      setStatus('draft');
      toast.success('Post added to queue');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const markShared = async (id: string) => {
    try {
      await socialMediaApi.updatePost(id, { status: 'shared' });
      toast.success('Marked as shared');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await socialMediaApi.deletePost(id);
      toast.success('Post removed');
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Post queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Draft and schedule share messages. Use “Open share links” to post manually via each
          platform’s share dialog.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-card p-4">
        <h2 className="font-medium">New queue item</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Content URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        </div>
        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATFORM_IDS.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={platforms.includes(id) ? 'default' : 'outline'}
                onClick={() => togglePlatform(id)}
              >
                {SOCIAL_PLATFORM_LABELS[id]}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SocialPostStatus)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add to queue
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts in the queue yet.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const id = String(post._id);
            const links = buildShareUrls({
              url: post.url,
              title: post.title,
              message: post.message,
              platforms: post.platforms,
            });
            return (
              <div key={id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{post.title}</h3>
                      <Badge variant="secondary">{post.status}</Badge>
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      {post.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {post.message ? (
                      <p className="mt-2 text-sm text-muted-foreground">{post.message}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.status !== 'shared' && (
                      <Button size="sm" variant="outline" onClick={() => markShared(id)}>
                        Mark shared
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {links.map((item) => (
                      <a
                        key={item.platform}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        Share on {item.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
