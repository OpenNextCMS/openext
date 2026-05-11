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

  const blockStyle = block.style as React.CSSProperties & { columnWidths?: string[] };
  const columnWidths = blockStyle?.columnWidths || [];
  const customWidth = columnWidths[columnIndex];
  const rowHasExplicitHeight = Boolean(blockStyle?.height && blockStyle.height !== 'auto');

  const editingStyles = isOver
    ? 'outline-primary bg-primary/10'
    : 'outline-transparent hover:outline-primary/40';

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors relative z-0 ${
        isEditing ? `rounded-md outline outline-1 outline-dashed ${editingStyles}` : 'min-h-0'
      }`}
      style={{
        flex: customWidth ? `0 0 ${customWidth}` : '1',
        width: customWidth || 'auto',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        minHeight: isEditing ? (rowHasExplicitHeight ? '0px' : '48px') : '0px',
      }}
    >
      {/* Visual indicator for empty state */}
      {Array.isArray(children) && children.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <MousePointerClick
            className={`h-5 w-5 mb-2 ${isOver ? 'text-primary' : 'text-muted-foreground'}`}
          />
          <p className="text-xs text-muted-foreground">Drop here</p>
        </div>
      )}

      {/* Content wrapper with z-index to handle clicks */}
      <div className="relative z-10 min-w-0">{children}</div>
    </div>
  );
};
