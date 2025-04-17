'use client';

import type React from 'react';

import { useDroppable } from '@dnd-kit/core';
import { MousePointerClick } from 'lucide-react';
import type { Block } from '@/types/index';

interface ColumnDropZoneProps {
  children: React.ReactNode;
  block: Block;
  columnIndex: number;
  isEditing?: boolean;
}

export const ColumnDropZone = ({
  children,
  block,
  columnIndex,
  isEditing = false,
}: ColumnDropZoneProps) => {
  // In editing mode, set up the droppable area
  const { setNodeRef, isOver } = useDroppable({
    id: `${block.uniqueId}-column-${columnIndex}`,
    data: { type: 'column', blockId: block.uniqueId, columnIndex },
    disabled: !isEditing,
  });

  const editingStyles = isOver
    ? 'bg-primary/10 border-primary border-dashed'
    : 'bg-muted/20 hover:bg-muted/30 border-border';

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[150px] transition-colors border rounded-md p-3 ${editingStyles}`}
    >
      {isOver && Array.isArray(children) && children.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full animate-pulse">
          <MousePointerClick className="h-5 w-5 text-primary mb-2" />
          <p className="text-sm text-primary">Drop here</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
};
