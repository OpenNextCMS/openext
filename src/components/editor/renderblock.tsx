'use client';

import type { Block } from '@/types/index';
import { ColumnBlock } from './blocks/ColumnBlock';
import { TextBlock } from './blocks/TextBlock';

const RenderBlock = ({ block, isEditing = true }: { block: Block; isEditing?: boolean }) => {
  if (block.type === 'column') {
    return <ColumnBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'text') {
    return <TextBlock block={block} isEditing={isEditing} />;
  }

  return null; // Unknown block type
};

export default RenderBlock;
