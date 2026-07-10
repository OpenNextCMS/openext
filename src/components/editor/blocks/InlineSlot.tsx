'use client';

import { useDndContext } from '@dnd-kit/core';
import type { Block } from '@/types/index';
import RenderBlock from '../renderblock';
import { ColumnDropZone } from './ColumnDropZone';
import { SortableChildren } from './SortableChildren';
import { zoneContainerId } from '@/utils/blockContainers';

interface InlineSlotProps {
  block: Block;
  // Which children[] slot this drop position maps to. Every slot on a given
  // block must use a distinct index so their contents don't collide.
  slotIndex: number;
  isEditing?: boolean;
}

// A single "insert blocks here" position that can live anywhere inside a
// pre-made component (between its heading, text, buttons, image, ...) or around
// it. It stores its blocks in block.children[slotIndex] — an ordinary block-tree
// slot — so placeBlockAt / removeBlock and precise reordering all work with no
// extra wiring. Collapses to nothing when empty and idle, and expands into a
// catchable "Drop here" band while a drag is in progress.
export function InlineSlot({ block, slotIndex, isEditing = true }: InlineSlotProps) {
  const { active } = useDndContext();
  const childBlocks = block.children?.[slotIndex] || [];

  // Published / preview render: just output the stored blocks inline.
  if (!isEditing) {
    if (childBlocks.length === 0) return null;
    return (
      <div className="cms-nested-content w-full">
        {childBlocks.map((child) => (
          <RenderBlock key={child.uniqueId} block={child} isEditing={false} />
        ))}
      </div>
    );
  }

  const isDragging = Boolean(active);
  if (!isDragging && childBlocks.length === 0) return null;

  return (
    <div className="w-full my-1" onClick={(e) => e.stopPropagation()}>
      <ColumnDropZone
        block={block}
        columnIndex={slotIndex}
        isEditing={true}
        isEmpty={childBlocks.length === 0}
      >
        <SortableChildren
          containerId={zoneContainerId(block.uniqueId || '', slotIndex)}
          childBlocks={childBlocks}
        />
      </ColumnDropZone>
    </div>
  );
}
