'use client';

import { useDraggable } from '@dnd-kit/core';
import { FileText, Newspaper, Tag, Database, Hash, ExternalLink, GripVertical } from 'lucide-react';
import type { ContentItem, MenuRedirectTargetType } from '@/types/menu-redirect';

const ICONS: Record<MenuRedirectTargetType, React.ComponentType<{ className?: string }>> = {
  page: FileText,
  blog: Newspaper,
  'blog-category': Tag,
  cms: Database,
  anchor: Hash,
  external: ExternalLink,
};

/** Stable draggable id for a content item. */
export function contentDragId(item: ContentItem): string {
  return `content:${item.targetType}:${item.targetId ?? item.targetUrl ?? item.label}`;
}

export default function ContentCard({ item, disabled }: { item: ContentItem; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contentDragId(item),
    data: item,
    disabled,
  });
  const Icon = ICONS[item.targetType] ?? FileText;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 rounded-lg border bg-card p-2 text-sm ${
        disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing hover:border-primary'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {!disabled ? <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.label}</p>
        {item.slug || item.targetUrl ? (
          <p className="truncate text-xs text-muted-foreground">{item.slug || item.targetUrl}</p>
        ) : null}
      </div>
    </div>
  );
}
