'use client';

import { Trash2, Waves } from 'lucide-react';
import { useState } from 'react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { useBlockEvents } from '@/hooks/useBlockEvents';

interface ShapeDividerContent {
  shape: 'wave' | 'curve' | 'tilt';
  color: string;
  height: number;
  flip?: boolean;
}

const defaultDivider: ShapeDividerContent = {
  shape: 'wave',
  color: 'var(--color-bg, #ffffff)',
  height: 120,
  flip: false,
};

const parseDividerContent = (content?: string): ShapeDividerContent => {
  if (!content) return defaultDivider;

  try {
    const parsed = JSON.parse(content) as Partial<ShapeDividerContent>;
    return {
      shape: parsed.shape || defaultDivider.shape,
      color: parsed.color || defaultDivider.color,
      height: Number(parsed.height || defaultDivider.height),
      flip: Boolean(parsed.flip),
    };
  } catch {
    return defaultDivider;
  }
};

const paths: Record<ShapeDividerContent['shape'], string> = {
  wave: 'M0,64 C220,140 420,0 640,72 C860,144 1040,24 1200,72 L1200,120 L0,120 Z',
  curve: 'M0,32 C260,120 760,120 1200,24 L1200,120 L0,120 Z',
  tilt: 'M0,76 L1200,12 L1200,120 L0,120 Z',
};

export const ShapeDividerBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  const divider = parseDividerContent(block.content);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Shape Divider Block'));
  };

  return (
    <div
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative"
      style={{
        width: '100%',
        height: `${divider.height}px`,
        lineHeight: 0,
        overflow: 'hidden',
        transform: divider.flip ? 'rotate(180deg)' : undefined,
        ...block.style,
        cursor: isEditing ? 'pointer' : 'default',
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <Waves className="h-3 w-3" />
          <span>Shape Divider</span>
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

      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <path d={paths[divider.shape]} style={{ fill: divider.color }} />
      </svg>
    </div>
  );
};
