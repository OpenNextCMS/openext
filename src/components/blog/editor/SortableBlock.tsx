'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContentBlock, BlogBlockType } from '@/types/index';
import { editorRegistry } from '@/components/blog/blocks/editors';
import { BLOCK_META } from '@/components/blog/blocks/types';

interface Props {
  block: ContentBlock;
  onChange: (data: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHide: () => void;
}

export default function SortableBlock({
  block,
  onChange,
  onDuplicate,
  onDelete,
  onToggleHide,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const Editor = editorRegistry[block.type as BlogBlockType];
  const meta = BLOCK_META[block.type as BlogBlockType];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-card ${block.hidden ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {meta?.label ?? block.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleHide}>
            {block.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-4">
        {Editor ? (
          <Editor data={block.data} onChange={(d: Record<string, unknown>) => onChange(d)} />
        ) : (
          <p className="text-sm text-muted-foreground">Unknown block type: {block.type}</p>
        )}
      </div>
    </div>
  );
}
