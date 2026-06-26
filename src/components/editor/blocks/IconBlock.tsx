'use client';

import { Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { renderSelectedIcon } from '@/components/editor/data/iconOptions';
import { useBlockEvents } from '@/hooks/useBlockEvents';

export const IconBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  const iconName = typeof block.icon === 'string' ? block.icon : block.content || 'sparkles';
  const selectedIcon = renderSelectedIcon(iconName, 'h-full w-full');

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Icon Block'));
  };

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative mb-4 inline-flex"
      style={{
        ...block.style,
        cursor: isEditing ? 'pointer' : block.events?.onClick === 'none' ? 'default' : 'pointer',
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <Sparkles className="h-3 w-3" />
          <span>Icon</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            onClick={handleRemove}
            className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {selectedIcon || <Sparkles className="h-full w-full" />}
    </div>
  );
};
