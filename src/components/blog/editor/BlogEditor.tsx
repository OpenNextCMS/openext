'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Loader2, Save, Send, CalendarClock, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAi } from '@/lib/ai/useAi';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { BlogBlockType, ContentBlock, BlogStatus } from '@/types/index';
import { slugify } from '@/utils/blog';
import { createBlock } from '@/components/blog/blocks/types';
import SortableBlock from './SortableBlock';
import AddBlockMenu from './AddBlockMenu';
import MetaPanel from './MetaPanel';
import SeoPanel from './SeoPanel';
import { emptyPost, type EditorPost, type EditorOptions } from './types';

const AUTOSAVE_MS = 20_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function refId(v: any): string {
  return typeof v === 'string' ? v : v?._id ?? '';
}

export default function BlogEditor({ id }: { id: string }) {
  const isNew = id === 'new';
  const [currentId, setCurrentId] = useState<string | null>(isNew ? null : id);
  const [post, setPost] = useState<EditorPost>(emptyPost());
  const [options, setOptions] = useState<EditorOptions>({ authors: [], categories: [], tags: [] });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(!isNew);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Mirror latest values for the autosave interval (avoids stale closures).
  const stateRef = useRef({ post, dirty, saving, currentId });
  stateRef.current = { post, dirty, saving, currentId };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { loading: aiLoading, run: runAi } = useAi();

  // ---- Load options + existing post ----
  useEffect(() => {
    Promise.all([
      fetch('/api/authors').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([a, c, t]) =>
        setOptions({
          authors: a?.data ?? [],
          categories: c?.data ?? [],
          tags: t?.data ?? [],
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    fetch(`/api/blogs/${id}`)
      .then((r) => r.json())
      .then((res) => {
        const b = res?.data;
        if (!b) {
          toast.error('Blog post not found');
          return;
        }
        setPost({
          _id: b._id,
          pageName: b.pageName ?? '',
          slug: b.slug ?? '',
          excerpt: b.excerpt ?? '',
          featuredImage: b.featuredImage ?? '',
          authorId: refId(b.authorId),
          categories: (b.categories ?? []).map(refId),
          tags: (b.tags ?? []).map(refId),
          contentBlocks: b.contentBlocks ?? [],
          seo: b.seo ?? { index: true },
          status: b.status ?? 'draft',
          scheduledAt: b.scheduledAt ?? null,
        });
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // ---- Field + block mutations ----
  const onField = useCallback(
    <K extends keyof EditorPost>(key: K, value: EditorPost[K]) => {
      setPost((prev) => {
        const next = { ...prev, [key]: value };
        // Keep slug in sync with title until the slug is manually edited.
        if (key === 'pageName' && !slugEdited) {
          next.slug = slugify(String(value));
        }
        return next;
      });
      setDirty(true);
    },
    [slugEdited]
  );

  const mutateBlocks = useCallback((fn: (blocks: ContentBlock[]) => ContentBlock[]) => {
    setPost((prev) => ({ ...prev, contentBlocks: fn(prev.contentBlocks) }));
    setDirty(true);
  }, []);

  const addBlock = (type: BlogBlockType) =>
    mutateBlocks((blocks) => [...blocks, createBlock(type) as ContentBlock]);

  const updateBlock = (id: string, data: Record<string, unknown>) =>
    mutateBlocks((blocks) => blocks.map((b) => (b.id === id ? { ...b, data } : b)));

  const duplicateBlock = (id: string) =>
    mutateBlocks((blocks) => {
      const i = blocks.findIndex((b) => b.id === id);
      if (i < 0) return blocks;
      const copy = { ...blocks[i], id: createBlock(blocks[i].type).id };
      return [...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)];
    });

  const deleteBlock = (id: string) =>
    mutateBlocks((blocks) => blocks.filter((b) => b.id !== id));

  const toggleHide = (id: string) =>
    mutateBlocks((blocks) => blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    mutateBlocks((blocks) => {
      const from = blocks.findIndex((b) => b.id === active.id);
      const to = blocks.findIndex((b) => b.id === over.id);
      return from < 0 || to < 0 ? blocks : arrayMove(blocks, from, to);
    });
  };

  // ---- Persistence ----
  const persist = useCallback(
    async (opts: { status?: BlogStatus; scheduledAt?: string | null; silent?: boolean } = {}) => {
      const snap = stateRef.current;
      if (snap.saving) return;
      if (!snap.post.pageName.trim()) {
        if (!opts.silent) toast.error('A title is required before saving');
        return;
      }
      setSaving(true);
      try {
        const payload = {
          pageName: snap.post.pageName,
          slug: snap.post.slug || undefined,
          excerpt: snap.post.excerpt,
          featuredImage: snap.post.featuredImage,
          authorId: snap.post.authorId || undefined,
          categories: snap.post.categories,
          tags: snap.post.tags,
          contentBlocks: snap.post.contentBlocks,
          seo: snap.post.seo,
          ...(opts.status ? { status: opts.status } : {}),
          ...(opts.scheduledAt !== undefined ? { scheduledAt: opts.scheduledAt } : {}),
        };

        const targetId = snap.currentId;
        const res = await fetch(targetId ? `/api/blogs/${targetId}` : '/api/blogs', {
          method: targetId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error?.message || 'Save failed');
        }
        const saved = json.data;
        if (!targetId && saved?._id) {
          setCurrentId(saved._id);
          window.history.replaceState(null, '', `/dashboard/blogs/${saved._id}/edit`);
        }
        // Sync server-resolved fields back (slug may have been uniquified; status fields).
        setPost((prev) => ({
          ...prev,
          _id: saved?._id ?? prev._id,
          slug: saved?.slug ?? prev.slug,
          status: saved?.status ?? prev.status,
          scheduledAt: saved?.scheduledAt ?? prev.scheduledAt,
        }));
        setDirty(false);
        setLastSaved(new Date());
        if (!opts.silent) {
          const successMessage =
            opts.status === 'published'
              ? 'Blog published successfully'
              : opts.status === 'scheduled'
                ? 'Blog scheduled successfully'
                : 'Blog saved successfully';
          toast.success(successMessage);
        }
      } catch (e) {
        if (!opts.silent) toast.error((e as Error).message);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Autosave when dirty.
  useEffect(() => {
    const timer = setInterval(() => {
      const snap = stateRef.current;
      if (snap.dirty && !snap.saving && snap.post.pageName.trim()) {
        persist({ silent: true });
      }
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [persist]);

  const generateWithAi = async () => {
    const topic = window.prompt('What should this post be about?');
    if (!topic) return;
    const res = await runAi<{ title: string; excerpt: string; contentBlocks: ContentBlock[] }>(
      'generate-blog',
      { topic }
    );
    if (!res) return;
    setPost((prev) => ({
      ...prev,
      pageName: prev.pageName || res.title,
      slug: prev.slug || (slugEdited ? prev.slug : slugify(res.title)),
      excerpt: prev.excerpt || res.excerpt,
      contentBlocks: [...prev.contentBlocks, ...(res.contentBlocks || [])],
    }));
    setDirty(true);
    toast.success('Draft generated');
  };

  const schedule = () => {
    const input = window.prompt(
      'Schedule publish date/time (YYYY-MM-DD HH:mm):',
      new Date(Date.now() + 3600_000).toISOString().slice(0, 16).replace('T', ' ')
    );
    if (!input) return;
    const when = new Date(input.replace(' ', 'T'));
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast.error('Please enter a valid future date');
      return;
    }
    persist({ status: 'scheduled', scheduledAt: when.toISOString() });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isNew && !currentId ? 'New post' : 'Edit post'}</h1>
          <p className="text-xs text-muted-foreground">
            {saving
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes'
                : lastSaved
                  ? `Saved ${lastSaved.toLocaleTimeString()}`
                  : 'Up to date'}
            {post.status ? ` · ${post.status}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={generateWithAi} disabled={!!aiLoading}>
            {aiLoading === 'generate-blog' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
          <Button variant="outline" size="sm" onClick={() => persist({ status: 'draft' })} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> Save draft
          </Button>
          <Button variant="outline" size="sm" onClick={schedule} disabled={saving}>
            <CalendarClock className="mr-2 h-4 w-4" /> Schedule
          </Button>
          <Button size="sm" onClick={() => persist({ status: 'published' })} disabled={saving}>
            <Send className="mr-2 h-4 w-4" /> Publish
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => post.slug && window.open(`/blog/${post.slug}`, '_blank')}
            disabled={!post.slug}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Blocks */}
            <div className="space-y-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext
                  items={post.contentBlocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {post.contentBlocks.map((block) => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        onChange={(data) => updateBlock(block.id, data)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onToggleHide={() => toggleHide(block.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {post.contentBlocks.length === 0 ? (
                <Card className="border-dashed py-12 text-center text-sm text-muted-foreground">
                  No blocks yet. Add your first block below.
                </Card>
              ) : null}

              <AddBlockMenu onAdd={addBlock} />
            </div>

            {/* Meta sidebar */}
            <aside className="space-y-4">
              <Card className="p-4">
                <MetaPanel
                  post={post}
                  options={options}
                  onField={onField}
                  slugEdited={slugEdited}
                  onSlugEdited={() => setSlugEdited(true)}
                />
              </Card>
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <Card className="p-6">
            <SeoPanel post={post} onChange={(seo) => onField('seo', seo)} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
