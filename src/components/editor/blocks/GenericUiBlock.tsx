'use client';

import { useState } from 'react';
import { Trash2, Layout } from 'lucide-react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { useBlockEvents } from '@/hooks/useBlockEvents';

interface GenericUiBlockProps extends BlockRendererProps {
  Component: React.ComponentType<any>;
  label?: string;
}

export const GenericUiBlock = ({ block, isEditing = true, Component, label }: GenericUiBlockProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  
  const blockLabel = label || block.label || 'UI Block';

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel(blockLabel));
  };

  if (!isEditing) {
    return <Component block={block} isEditing={false} />;
  }

  return (
    <div
      className="relative group mb-4"
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white pointer-events-none">
            <Layout className="h-3 w-3" />
            <span>{blockLabel}</span>
          </div>
          <div className="absolute right-2 top-2 z-10 flex gap-1">
             <button
              onClick={handleRemove}
              className="rounded bg-red-500 p-1 text-white hover:bg-red-600 shadow-sm"
              title={`Delete ${blockLabel}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}

      <div
        className={`transition-all duration-200 ${
          isHovered ? 'outline outline-1 outline-blue-500 outline-offset-2' : ''
        }`}
      >
        <Component block={block} isEditing={true} />
      </div>
    </div>
  );
};
