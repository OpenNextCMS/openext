'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2, Heart, Plus } from 'lucide-react';
import type { Block, BlockRendererProps, BlockData } from '@/types/index';
import { getIconForBlock } from './icons';
import { ColumnDropZone } from './ColumnDropZone';
import RenderBlock from '../renderblock';
import { useAppDispatch } from '@/redux/hooks';
import {
  insertColumn,
  removeBlock,
  removeColumn,
  setSelectedBlock,
  setSelectedLabel,
} from '@/redux/canvasSlice';
import { useBlockEvents } from '@/hooks/useBlockEvents';

interface Props extends BlockRendererProps {
  isEditing?: boolean;
}

function DraggableColumnChild({ child }: { child: Block }) {
  const childDisplay = (child.style?.display as string) || 'block';
  const isInlineDisplay = childDisplay === 'inline' || childDisplay === 'inline-block';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: child.uniqueId || '',
    data: {
      source: 'existing-block',
      blockId: child.uniqueId,
    },
    disabled: !child.uniqueId,
  });

  return (
    <div
      ref={setNodeRef}
      className="group/column-child relative"
      style={{
        display: isInlineDisplay ? 'inline-block' : 'block',
        width: isInlineDisplay ? child.style?.width || 'auto' : '100%',
        height: child.style?.height,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 30 : undefined,
        verticalAlign: isInlineDisplay ? 'baseline' : undefined,
      }}
    >
      <button
        type="button"
        className="absolute left-[-8px] top-2 z-20 hidden h-6 w-6 cursor-grab items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-primary group-hover/column-child:flex active:cursor-grabbing"
        title="Move block to another column"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <RenderBlock key={child.uniqueId} block={child} isEditing={true} />
    </div>
  );
}

export const ColumnBlock = ({ block, isEditing = false }: Props) => {
  const dispatch = useAppDispatch();
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleInsertColumn = (e: React.MouseEvent, columnIndex: number) => {
    e.stopPropagation();
    if (!block.uniqueId) return;
    dispatch(insertColumn({ targetBlockId: block.uniqueId, columnIndex }));
  };

  const handleRemoveColumn = (e: React.MouseEvent, columnIndex: number) => {
    e.stopPropagation();
    if (!block.uniqueId) return;
    dispatch(removeColumn({ targetBlockId: block.uniqueId, columnIndex }));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Column Layout'));
  };

  const blockStyle = typeof block.style === 'object' ? block.style : {};
  const layoutDisplay = (blockStyle.display as React.CSSProperties['display']) || 'flex';
  const layoutGap = (blockStyle.gap as React.CSSProperties['gap']) || '16px';
  const layoutRestStyle = { ...blockStyle };
  delete layoutRestStyle.display;
  delete layoutRestStyle.gap;

  // If not in editing mode, use a simplified view
  if (!isEditing) {
    return (
      <div
        className="flex gap-4"
        style={{
          display: layoutDisplay,
          gap: layoutGap,
          width: blockStyle.width || '100%',
          ...layoutRestStyle,
        }}
      >
        {block.children?.map((childBlocks, index) => (
          <div key={`${block.uniqueId}-col-${index}`} className="min-w-0 flex-1">
            {Array.isArray(childBlocks) && childBlocks.length > 0
              ? childBlocks.map((child) => (
                  <RenderBlock key={child.uniqueId} block={child} isEditing={false} />
                ))
              : null}
          </div>
        ))}
      </div>
    );
  }

  // Editing mode with all controls and structure
  return (
    <div
      className="group relative mb-6"
      style={{
        display: layoutDisplay,
        gap: layoutGap,
        width: blockStyle.width || '100%',
        ...layoutRestStyle,
      }}
      onClick={handleSelect}
      onMouseEnter={() => {
        document.querySelectorAll(`.hover-${block.uniqueId}`).forEach((el) => {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.pointerEvents = 'auto';
        });
      }}
      onMouseLeave={() => {
        document.querySelectorAll(`.hover-${block.uniqueId}`).forEach((el) => {
          (el as HTMLElement).style.opacity = '0';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      }}
    >
      {/* Top Label */}
      <div
        id={`label-${block.uniqueId}`}
        className={`hover-${block.uniqueId} absolute top-[-12px] left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 opacity-0 transition-opacity duration-200 z-10 pointer-events-none`}
      >
        {getIconForBlock(block.icon as string | undefined)}
        <span className="ml-1">Column Layout</span>
      </div>

      {/* Top Right Buttons */}
      <div
        id={`actions-${block.uniqueId}`}
        className={`hover-${block.uniqueId} absolute top-[-12px] right-0 flex gap-1 opacity-0 transition-opacity duration-200 z-10 pointer-events-none`}
      >
        <button className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 cursor-pointer mb-1">
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleRemove}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Right Heart */}
      <div
        className={`hover-${block.uniqueId} absolute bottom-[-12px] right-2 flex gap-1 opacity-0 transition-opacity duration-200 z-10 pointer-events-none`}
      >
        <button className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 cursor-pointer">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease-in-out',
          height: '100%',
          display: 'contents',
        }}
      >
        <button
          type="button"
          onClick={(e) => handleInsertColumn(e, 0)}
          className="hover-column-insert flex min-h-[150px] w-0 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-transparent text-muted-foreground opacity-0 transition-all hover:border-primary hover:bg-primary/10 hover:text-primary group-hover:w-6 group-hover:opacity-100"
          title="Add column before"
        >
          <Plus className="h-4 w-4" />
        </button>

        {block.children?.map((childBlocks, index) => (
          <div key={`${block.uniqueId}-col-wrap-${index}`} className="flex min-w-0 flex-1 gap-2">
            <div className="group/column relative flex min-w-0 flex-1">
              {block.children && block.children.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveColumn(e, index)}
                  className="absolute right-2 top-2 z-20 hidden rounded bg-red-500 p-1 text-white shadow-sm hover:bg-red-600 group-hover/column:block"
                  title="Delete this column"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}

              <ColumnDropZone
                key={`${block.uniqueId}-col-${index}`}
                columnIndex={index}
                block={block}
                isEditing={true}
              >
                {Array.isArray(childBlocks) && childBlocks.length > 0 ? (
                  childBlocks.map((child) => (
                    <DraggableColumnChild key={child.uniqueId} child={child} />
                  ))
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      color: '#6b7280',
                      minHeight: '120px',
                      width: '100%',
                    }}
                  >
                    <GripVertical style={{ width: 20, height: 20, marginBottom: '8px' }} />
                    <p style={{ fontSize: '14px' }}>Drop blocks here</p>
                  </div>
                )}
              </ColumnDropZone>
            </div>

            <button
              type="button"
              onClick={(e) => handleInsertColumn(e, index + 1)}
              className="hover-column-insert flex min-h-[150px] w-0 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-transparent text-muted-foreground opacity-0 transition-all hover:border-primary hover:bg-primary/10 hover:text-primary group-hover:w-6 group-hover:opacity-100"
              title="Add column here"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
