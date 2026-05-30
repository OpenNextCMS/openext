'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, LayoutGrid, Trash2 } from 'lucide-react';
import { Block, BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import RenderBlock from '../renderblock';
import { useBlockEvents } from '@/hooks/useBlockEvents';
import { ColumnDropZone } from './ColumnDropZone';

function DraggableRowColumn({
  children,
  block,
  columnIndex,
  isEditing,
}: {
  children: React.ReactNode;
  block: Block;
  columnIndex: number;
  isEditing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${block.uniqueId}-row-column-${columnIndex}`,
    data: {
      source: 'row-column',
      rowBlockId: block.uniqueId,
      columnIndex,
    },
    disabled: !isEditing || !block.uniqueId,
  });

  return (
    <div
      ref={setNodeRef}
      className="group/row-column relative min-w-0 overflow-hidden"
      style={{
        flex: '1 1 0',
        minWidth: 0,
        boxSizing: 'border-box',
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 30 : undefined,
      }}
    >
      {isEditing && (
        <button
          type="button"
          className="absolute left-2 top-2 z-20 hidden h-6 w-6 cursor-grab items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary group-hover/row-column:flex active:cursor-grabbing"
          title="Move column to another row"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <ColumnDropZone columnIndex={columnIndex} block={block} isEditing={isEditing}>
        {children}
      </ColumnDropZone>
    </div>
  );
}

export const RowBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Row Layout'));
  };

  const blockStyle = typeof block.style === 'object' ? block.style : {};
  const hasExplicitHeight = Boolean(blockStyle.height && blockStyle.height !== 'auto');
  const rowFlexWrap = (blockStyle.flexWrap as React.CSSProperties['flexWrap']) || 'wrap';

  return (
    <div
      onClick={handleSelect}
      className={`relative group ${isHovered && isEditing ? 'outline-2 outline-dashed outline-blue-500' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-10">
          <LayoutGrid className="w-3 h-3" />
          <span>Row</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button onClick={handleRemove} className="bg-red-500 text-white p-1 rounded hover:bg-red-600">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div
        style={{
          display: blockStyle.display || 'flex',
          flexDirection: blockStyle.flexDirection || 'row',
          flexWrap: rowFlexWrap,
          gap: blockStyle.gap || '16px',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          minHeight: blockStyle.minHeight || (hasExplicitHeight ? '0px' : isEditing ? '48px' : undefined),
          ...blockStyle,
        }}
      >
        {/* Children rendering */}
        {block.children && block.children.length > 0 ? (
          block.children.map((col, index) => (
            <DraggableRowColumn
              key={`${block.uniqueId}-col-${index}`}
              columnIndex={index}
              block={block as Block}
              isEditing={isEditing}
            >
              {col.map((child) => (
                <RenderBlock key={child.uniqueId} block={child} isEditing={isEditing} />
              ))}
            </DraggableRowColumn>
          ))
        ) : isEditing ? (
          <div className="w-full text-center text-muted-foreground p-4 border border-dashed rounded flex flex-col items-center justify-center">
            <LayoutGrid className="h-8 w-8 mb-2 opacity-20" />
            <p>Row Layout (Empty)</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
