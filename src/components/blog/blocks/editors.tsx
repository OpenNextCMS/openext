'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { BlogBlockType } from '@/types/index';
import type {
  HeadingData,
  ParagraphData,
  ImageData,
  GalleryData,
  VideoData,
  QuoteData,
  ButtonData,
  TableData,
  CodeData,
  FaqData,
  NewsletterData,
  AuthorBoxData,
  RelatedPostsData,
  CustomHtmlData,
} from './types';

export interface EditorProps<T> {
  data: T;
  onChange: (data: T) => void;
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

// ---- Text ----
function HeadingEditor({ data, onChange }: EditorProps<HeadingData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Text</Label>
        <Input value={data.text} onChange={(e) => onChange({ ...data, text: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Level</Label>
        <select
          className={selectClass}
          value={data.level}
          onChange={(e) => onChange({ ...data, level: e.target.value as HeadingData['level'] })}
        >
          {['h1', 'h2', 'h3', 'h4'].map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ParagraphEditor({ data, onChange }: EditorProps<ParagraphData>) {
  return (
    <div className="space-y-1">
      <Label>Content (HTML allowed)</Label>
      <Textarea
        rows={5}
        value={data.text}
        onChange={(e) => onChange({ ...data, text: e.target.value })}
      />
    </div>
  );
}

function QuoteEditor({ data, onChange }: EditorProps<QuoteData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Quote</Label>
        <Textarea
          rows={3}
          value={data.text}
          onChange={(e) => onChange({ ...data, text: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Citation</Label>
        <Input
          value={data.cite ?? ''}
          onChange={(e) => onChange({ ...data, cite: e.target.value })}
        />
      </div>
    </div>
  );
}

function CodeEditor({ data, onChange }: EditorProps<CodeData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Language</Label>
        <Input
          value={data.language}
          onChange={(e) => onChange({ ...data, language: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Code</Label>
        <Textarea
          rows={6}
          className="font-mono"
          value={data.code}
          onChange={(e) => onChange({ ...data, code: e.target.value })}
        />
      </div>
    </div>
  );
}

// ---- Media ----
function ImageEditor({ data, onChange }: EditorProps<ImageData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Image URL</Label>
        <Input value={data.url} onChange={(e) => onChange({ ...data, url: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Alt text</Label>
        <Input value={data.alt} onChange={(e) => onChange({ ...data, alt: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Caption</Label>
        <Input
          value={data.caption ?? ''}
          onChange={(e) => onChange({ ...data, caption: e.target.value })}
        />
      </div>
    </div>
  );
}

function GalleryEditor({ data, onChange }: EditorProps<GalleryData>) {
  const update = (i: number, key: 'url' | 'alt', value: string) => {
    const images = data.images.map((img, idx) => (idx === i ? { ...img, [key]: value } : img));
    onChange({ ...data, images });
  };
  return (
    <div className="space-y-3">
      {data.images.map((img, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label>Image {i + 1} URL</Label>
            <Input value={img.url} onChange={(e) => update(i, 'url', e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Alt</Label>
            <Input value={img.alt} onChange={(e) => update(i, 'alt', e.target.value)} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange({ ...data, images: data.images.filter((_, idx) => idx !== i) })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...data, images: [...data.images, { url: '', alt: '' }] })}
      >
        <Plus className="mr-1 h-4 w-4" /> Add image
      </Button>
    </div>
  );
}

function VideoEditor({ data, onChange }: EditorProps<VideoData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Video URL</Label>
        <Input value={data.url} onChange={(e) => onChange({ ...data, url: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Provider</Label>
        <select
          className={selectClass}
          value={data.provider}
          onChange={(e) => onChange({ ...data, provider: e.target.value as VideoData['provider'] })}
        >
          <option value="youtube">YouTube</option>
          <option value="vimeo">Vimeo</option>
          <option value="file">Direct file</option>
        </select>
      </div>
    </div>
  );
}

// ---- Layout ----
function ButtonEditor({ data, onChange }: EditorProps<ButtonData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Label</Label>
        <Input value={data.label} onChange={(e) => onChange({ ...data, label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Link (href)</Label>
        <Input value={data.href} onChange={(e) => onChange({ ...data, href: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Style</Label>
        <select
          className={selectClass}
          value={data.style}
          onChange={(e) => onChange({ ...data, style: e.target.value as ButtonData['style'] })}
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="outline">Outline</option>
        </select>
      </div>
    </div>
  );
}

function DividerEditor() {
  return <p className="text-sm text-muted-foreground">No settings for this block.</p>;
}

function TableEditor({ data, onChange }: EditorProps<TableData>) {
  const setCell = (r: number, c: number, value: string) => {
    const rows = data.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row
    );
    onChange({ ...data, rows });
  };
  const cols = data.rows[0]?.length ?? 2;
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.hasHeader}
          onChange={(e) => onChange({ ...data, hasHeader: e.target.checked })}
        />
        First row is a header
      </label>
      <div className="space-y-2">
        {data.rows.map((row, ri) => (
          <div key={ri} className="flex gap-2">
            {row.map((cell, ci) => (
              <Input
                key={ci}
                value={cell}
                placeholder={ri === 0 && data.hasHeader ? `Header ${ci + 1}` : ''}
                onChange={(e) => setCell(ri, ci, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...data, rows: [...data.rows, Array(cols).fill('')] })}
        >
          <Plus className="mr-1 h-4 w-4" /> Row
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...data, rows: data.rows.map((r) => [...r, '']) })}
        >
          <Plus className="mr-1 h-4 w-4" /> Column
        </Button>
      </div>
    </div>
  );
}

// ---- Dynamic ----
function FaqEditor({ data, onChange }: EditorProps<FaqData>) {
  const update = (i: number, key: 'q' | 'a', value: string) => {
    const items = data.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it));
    onChange({ ...data, items });
  };
  return (
    <div className="space-y-3">
      {data.items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label>Question {i + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input value={item.q} onChange={(e) => update(i, 'q', e.target.value)} />
          <Textarea rows={2} value={item.a} onChange={(e) => update(i, 'a', e.target.value)} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ ...data, items: [...data.items, { q: '', a: '' }] })}
      >
        <Plus className="mr-1 h-4 w-4" /> Add Q&A
      </Button>
    </div>
  );
}

function NewsletterEditor({ data, onChange }: EditorProps<NewsletterData>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Heading</Label>
        <Input value={data.heading} onChange={(e) => onChange({ ...data, heading: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Input placeholder</Label>
        <Input
          value={data.placeholder}
          onChange={(e) => onChange({ ...data, placeholder: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>Button label</Label>
        <Input
          value={data.buttonLabel}
          onChange={(e) => onChange({ ...data, buttonLabel: e.target.value })}
        />
      </div>
    </div>
  );
}

function AuthorBoxEditor({ data, onChange }: EditorProps<AuthorBoxData>) {
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
        value={data.authorId}
        onChange={(e) => onChange({ ...data, authorId: e.target.value })}
      >
        <option value="">Select an author…</option>
        {authors.map((a) => (
          <option key={a._id} value={a._id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function RelatedPostsEditor({ data, onChange }: EditorProps<RelatedPostsData>) {
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((res) => Array.isArray(res?.data) && setCategories(res.data))
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Number of posts</Label>
        <Input
          type="number"
          min={1}
          max={12}
          value={data.count}
          onChange={(e) => onChange({ ...data, count: Number(e.target.value) || 1 })}
        />
      </div>
      <div className="space-y-1">
        <Label>Category (optional)</Label>
        <select
          className={selectClass}
          value={data.categoryId ?? ''}
          onChange={(e) => onChange({ ...data, categoryId: e.target.value || undefined })}
        >
          <option value="">Any category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CustomHtmlEditor({ data, onChange }: EditorProps<CustomHtmlData>) {
  return (
    <div className="space-y-1">
      <Label>Custom HTML (sanitized on render)</Label>
      <Textarea
        rows={6}
        className="font-mono"
        value={data.html}
        onChange={(e) => onChange({ ...data, html: e.target.value })}
      />
    </div>
  );
}

/** Registry of editor components keyed by block type. */
export const editorRegistry: Record<
  BlogBlockType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  React.ComponentType<EditorProps<any>>
> = {
  heading: HeadingEditor,
  paragraph: ParagraphEditor,
  quote: QuoteEditor,
  code: CodeEditor,
  image: ImageEditor,
  gallery: GalleryEditor,
  video: VideoEditor,
  button: ButtonEditor,
  divider: DividerEditor,
  table: TableEditor,
  faq: FaqEditor,
  newsletter: NewsletterEditor,
  'author-box': AuthorBoxEditor,
  'related-posts': RelatedPostsEditor,
  'custom-html': CustomHtmlEditor,
};
