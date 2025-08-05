'use client';

import { GripVertical, Edit2, Trash2, Heart } from 'lucide-react';
import type { BlockRendererProps } from '@/types/index';
import { getIconForBlock } from './icons';
import { ColumnDropZone } from './ColumnDropZone';
import RenderBlock from '../renderblock';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';

interface Props extends BlockRendererProps {
  isEditing?: boolean;
}

export const ColumnBlock = ({ block, isEditing = false }: Props) => {
  const dispatch = useAppDispatch();

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const blockStyle = typeof block.style === 'object' ? block.style : {};

  // If not in editing mode, use a simplified view
  if (!isEditing) {
    return (
      <div className="flex gap-4">
        {block.children?.map((childBlocks, index) => (
          <div key={`${block.uniqueId}-col-${index}`} className="flex-1">
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
      className="group"
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
      style={{
        position: 'relative',
        marginBottom: '1.5rem',
        ...blockStyle,
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
          display: 'flex',
          gap: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {block.children?.map((childBlocks, index) => (
          <ColumnDropZone
            key={`${block.uniqueId}-col-${index}`}
            columnIndex={index}
            block={block}
            isEditing={true}
          >
            {Array.isArray(childBlocks) && childBlocks.length > 0 ? (
              childBlocks.map((child) => (
                <RenderBlock key={child.uniqueId} block={child} isEditing={true} />
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
                }}
              >
                <GripVertical style={{ width: 20, height: 20, marginBottom: '8px' }} />
                <p style={{ fontSize: '14px' }}>Drop blocks here</p>
              </div>
            )}
          </ColumnDropZone>
        ))}
      </div>
    </div>
  );
};
