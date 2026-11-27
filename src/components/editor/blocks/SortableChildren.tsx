'use client';

import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Block } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';
import RenderBlock from '../renderblock';

function SortableNestedBlock({ child }: { child: Block }) {
  const dispatch = useAppDispatch();
  const childDisplay = (child.style?.display as string) || 'block';
  const isInlineDisplay = childDisplay === 'inline' || childDisplay === 'inline-block';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: child.uniqueId || '',
    data: { source: 'existing-block' },
    disabled: !child.uniqueId,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (child.uniqueId) dispatch(removeBlock(child.uniqueId));
  };

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
      <div className="absolute left-[-8px] top-2 z-20 hidden items-center gap-1 group-hover/nested-child:flex">
        <button
          type="button"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary active:cursor-grabbing"
          title="Move block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:border-destructive hover:text-destructive"
          title="Delete block"
          onClick={handleDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <RenderBlock key={child.uniqueId} block={child} isEditing={true} />
    </div>
  );
}

interface SortableChildrenProps {
  containerId: string;
  childBlocks: Block[];
}

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
