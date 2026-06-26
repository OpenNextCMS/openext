'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SectionType } from '@/types/index';

type S = Record<string, unknown>;
interface PanelProps {
  settings: S;
  onChange: (settings: S) => void;
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

function Text({ label, k, settings, onChange }: PanelProps & { label: string; k: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        value={String(settings[k] ?? '')}
        onChange={(e) => onChange({ ...settings, [k]: e.target.value })}
      />
    </div>
  );
}

function HeroPanel(p: PanelProps) {
  return (
    <div className="space-y-3">
      <Text {...p} label="Heading" k="heading" />
      <Text {...p} label="Subheading" k="subheading" />
      <Text {...p} label="Background image URL" k="image" />
    </div>
  );
}

function LatestPostsPanel(p: PanelProps) {
  return (
    <div className="space-y-3">
      <Text {...p} label="Title" k="title" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Count</Label>
          <Input
            type="number"
            min={1}
            value={Number(p.settings.count) || 6}
            onChange={(e) => p.onChange({ ...p.settings, count: Number(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-1">
          <Label>Columns</Label>
          <select
            className={selectClass}
            value={Number(p.settings.columns) || 3}
            onChange={(e) => p.onChange({ ...p.settings, columns: Number(e.target.value) })}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function FeaturedPostPanel(p: PanelProps) {
  const [posts, setPosts] = useState<{ _id: string; pageName: string }[]>([]);
  useEffect(() => {
    fetch('/api/blogs?status=published&limit=50')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setPosts(res.data))
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-3">
      <Text {...p} label="Label" k="title" />
      <div className="space-y-1">
        <Label>Post</Label>
        <select
          className={selectClass}
          value={String(p.settings.postId ?? '')}
          onChange={(e) => p.onChange({ ...p.settings, postId: e.target.value })}
        >
          <option value="">Most recent</option>
          {posts.map((post) => (
            <option key={post._id} value={post._id}>
              {post.pageName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AuthorPanel(p: PanelProps) {
  const [authors, setAuthors] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    fetch('/api/authors')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setAuthors(res.data))
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-1">
      <Label>Author</Label>
      <select
        className={selectClass}
        value={String(p.settings.authorId ?? '')}
        onChange={(e) => p.onChange({ ...p.settings, authorId: e.target.value })}
      >
        <option value="">Select author…</option>
        {authors.map((a) => (
          <option key={a._id} value={a._id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SidebarPanel({ settings, onChange }: PanelProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between text-sm">
        Show recent posts
        <Switch
          checked={!!settings.showRecent}
          onCheckedChange={(v) => onChange({ ...settings, showRecent: v })}
        />
      </label>
      <label className="flex items-center justify-between text-sm">
        Show categories
        <Switch
          checked={!!settings.showCategories}
          onCheckedChange={(v) => onChange({ ...settings, showCategories: v })}
        />
      </label>
      <div className="space-y-1">
        <Label>Position</Label>
        <select
          className={selectClass}
          value={String(settings.position ?? 'right')}
          onChange={(e) => onChange({ ...settings, position: e.target.value })}
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}

function CtaPanel(p: PanelProps) {
  return (
    <div className="space-y-3">
      <Text {...p} label="Heading" k="heading" />
      <Text {...p} label="Button label" k="buttonLabel" />
      <Text {...p} label="Button link" k="href" />
    </div>
  );
}

function NewsletterPanel(p: PanelProps) {
  return (
    <div className="space-y-3">
      <Text {...p} label="Heading" k="heading" />
      <Text {...p} label="Button label" k="buttonLabel" />
    </div>
  );
}

function CategoriesPanel(p: PanelProps) {
  return <Text {...p} label="Title" k="title" />;
}

export const settingsRegistry: Record<SectionType, React.ComponentType<PanelProps>> = {
  hero: HeroPanel,
  'featured-post': FeaturedPostPanel,
  'latest-posts': LatestPostsPanel,
  categories: CategoriesPanel,
  sidebar: SidebarPanel,
  newsletter: NewsletterPanel,
  cta: CtaPanel,
  author: AuthorPanel,
  'footer-cta': CtaPanel,
};
