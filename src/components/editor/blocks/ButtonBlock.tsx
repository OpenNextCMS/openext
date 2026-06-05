'use client';

import { Trash2, MousePointer2 } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedLabel,
  setSelectedBlock,
  updateBlockContent,
} from '@/redux/canvasSlice';
import { useState } from 'react';
import { useBlockEvents } from '@/hooks/useBlockEvents';
import { renderSelectedIcon } from '@/components/editor/data/iconOptions';

export const ButtonBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  const selectedIcon = renderSelectedIcon(
    typeof block.icon === 'string' ? block.icon : undefined,
    'h-4 w-4'
  );

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedLabel('Button Block'));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const handleContentBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    const newContent = e.currentTarget.textContent || '';
    dispatch(updateBlockContent({ id: block.uniqueId ?? '', content: newContent }));
  };

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative mb-4 inline-block"
      style={{
        ...block.style,
        cursor: isEditing ? 'pointer' : 'default',
        border: isHovered && isEditing ? '1px solid #3b82f6' : block.style?.border || 'none',
        backgroundColor: isHovered
          ? (block.hoverStyle?.backgroundColor || block.style?.backgroundColor || 'var(--color-primary, #2563eb)')
          : (block.style?.backgroundColor || 'var(--color-primary, #3b82f6)'),
        color: isHovered
          ? (block.hoverStyle?.color || block.style?.color || 'var(--color-bg, white)')
          : (block.style?.color || 'var(--color-bg, white)'),
        transition: 'all 0.2s ease',
        borderRadius: block.style?.borderRadius || 'var(--radius-md, 4px)',
      }}
    >
      {isEditing && isHovered && (
        <div
          id={`label-${block.uniqueId}`}
          style={{
            position: 'absolute',
            top: '-12px',
            left: '8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 10,
          }}
        >
          <MousePointer2 style={{ width: 12, height: 12 }} />
          <span>Button</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div
          id={`actions-${block.uniqueId}`}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '6px',
            zIndex: 10,
          }}
        >
          <button
            onClick={handleRemove}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px 6px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </button>
        </div>
      )}

      <div
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onBlur={handleContentBlur}
        style={{
          outline: 'none',
          minWidth: '100px',
          textAlign: 'center',
          padding: '8px 16px',
          fontWeight: block.style?.fontWeight || '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {selectedIcon && <span contentEditable={false}>{selectedIcon}</span>}
        <span>{block.content || 'Click Me'}</span>
      </div>
    </div>
  );
};
