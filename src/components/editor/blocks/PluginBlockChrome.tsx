'use client';

import { useState } from 'react';
import { Trash2, Puzzle } from 'lucide-react';
import type { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';

interface PluginBlockChromeProps extends BlockRendererProps {
  /** Registry plugins are typed loosely; props match BlockRendererProps at runtime. */
  Component: React.ComponentType<Record<string, unknown>>;
  label?: string;
}

/**
 * Thin editor chrome for marketplace/plugin blocks: hover label, select, and
 * delete. Unlike GenericUiBlock, this does not add InlineSlots (plugins own
 * their layout).
 */
export function PluginBlockChrome({
  block,
  isEditing = true,
  Component,
  label,
}: PluginBlockChromeProps) {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const blockLabel = label || block.label || 'Plugin';

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel(blockLabel));
  };

  if (!isEditing) {
    return <Component {...({ block, isEditing: false } as Record<string, unknown>)} />;
  }

  return (
    <div
      className="relative group mb-2"
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <div className="pointer-events-none absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
            <Puzzle className="h-3 w-3" />
            <span>{blockLabel}</span>
          </div>
          <div className="absolute right-2 top-2 z-20 flex gap-1">
            <button
              type="button"
              onClick={handleRemove}
              className="rounded bg-red-500 p-1.5 text-white shadow-sm hover:bg-red-600"
              title={`Delete ${blockLabel}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
      <div
        className={`transition-all duration-200 ${
          isHovered ? 'outline outline-1 outline-blue-500 outline-offset-2' : ''
        }`}
      >
        <Component {...({ block, isEditing: true } as Record<string, unknown>)} />
      </div>
    </div>
  );
}
