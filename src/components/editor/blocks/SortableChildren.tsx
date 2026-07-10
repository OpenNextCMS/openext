'use client';

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Block } from '@/types/index';
import RenderBlock from '../renderblock';

// A single nested block that can be dragged (by its grip handle) to reorder it
// within its zone or move it into another zone. Being a sortable item means
// dnd-kit tags its drop data with { sortable: { containerId, index } }, which
// handleDragEnd reads to compute the precise target position.
function SortableNestedBlock({ child }: { child: Block }) {
  const childDisplay = (child.style?.display as string) || 'block';
  const isInlineDisplay = childDisplay === 'inline' || childDisplay === 'inline-block';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.uniqueId || '',
    data: { source: 'existing-block' },
    disabled: !child.uniqueId,
  });

  return (
    <div
      ref={setNodeRef}
      className="group/nested-child relative"
      style={{
        display: isInlineDisplay ? 'inline-block' : 'block',
        width: isInlineDisplay ? child.style?.width || 'auto' : '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 30 : undefined,
        verticalAlign: isInlineDisplay ? 'baseline' : undefined,
      }}
    >
      <button
        type="button"
        className="absolute left-[-8px] top-2 z-20 hidden h-6 w-6 cursor-grab items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary group-hover/nested-child:flex active:cursor-grabbing"
        title="Move block"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <RenderBlock key={child.uniqueId} block={child} isEditing={true} />
    </div>
  );
}

interface SortableChildrenProps {
  containerId: string;
  childBlocks: Block[];
}

// Wraps the blocks of one drop zone in a SortableContext so they can be
// reordered precisely. Reused by every container (pre-made blocks, columns,
// rows) so nesting behaves identically everywhere.
export function SortableChildren({ containerId, childBlocks }: SortableChildrenProps) {
  return (
    <SortableContext
      id={containerId}
      items={childBlocks.map((child) => child.uniqueId || '')}
      strategy={verticalListSortingStrategy}
    >
      {childBlocks.map((child) => (
        <SortableNestedBlock key={child.uniqueId} child={child} />
      ))}
    </SortableContext>
  );
}
