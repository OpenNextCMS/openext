'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { EditorPost, EditorOptions } from './types';

interface Props {
  post: EditorPost;
  options: EditorOptions;
  onField: <K extends keyof EditorPost>(key: K, value: EditorPost[K]) => void;
  slugEdited: boolean;
  onSlugEdited: () => void;
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function MetaPanel({ post, options, onField, slugEdited, onSlugEdited }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFeaturedImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/blogs/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Upload failed');
      }
      onField('featuredImage', data.filePath);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Label>Title</Label>
        <Input
          value={post.pageName}
          onChange={(e) => onField('pageName', e.target.value)}
          placeholder="Post title"
        />
      </div>

      <div className="space-y-1">
        <Label>Slug</Label>
        <Input
          value={post.slug}
          onChange={(e) => {
            onSlugEdited();
            onField('slug', e.target.value);
          }}
          placeholder="auto-generated-from-title"
        />
        {!slugEdited ? (
          <p className="text-xs text-muted-foreground">Auto-generated from the title until edited.</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label>Excerpt</Label>
        <Textarea
          rows={3}
          value={post.excerpt}
          onChange={(e) => onField('excerpt', e.target.value)}
          placeholder="Short summary shown in listings"
        />
      </div>

      <div className="space-y-1">
        <Label>Featured image</Label>
        <Input
          value={post.featuredImage}
          onChange={(e) => onField('featuredImage', e.target.value)}
          placeholder="Paste an image URL or upload below"
        />
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFeaturedImageUpload(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload from device'}
          </button>
          {post.featuredImage ? (
            <button
              type="button"
              onClick={() => onField('featuredImage', '')}
              className="text-sm text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          ) : null}
        </div>
        {post.featuredImage ? (
          <img
            src={post.featuredImage}
            alt="Featured preview"
            className="mt-2 h-32 w-full rounded-lg object-cover"
          />
        ) : null}
      </div>

      <div className="space-y-1">
        <Label>Author</Label>
        <select
          className={selectClass}
          value={post.authorId}
          onChange={(e) => onField('authorId', e.target.value)}
        >
          <option value="">Select author…</option>
          {options.authors.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Categories</Label>
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
          {options.categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">No categories yet.</p>
          ) : (
            options.categories.map((c) => (
              <label key={c._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={post.categories.includes(c._id)}
                  onChange={() => onField('categories', toggleId(post.categories, c._id))}
                />
                {c.name}
              </label>
            ))
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
          {options.tags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tags yet.</p>
          ) : (
            options.tags.map((t) => (
              <label key={t._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={post.tags.includes(t._id)}
                  onChange={() => onField('tags', toggleId(post.tags, t._id))}
                />
                {t.name}
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
