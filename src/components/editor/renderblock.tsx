'use client';

import type { Block } from '@/types/index';
import { ColumnBlock } from './blocks/ColumnBlock';
import { TextBlock } from './blocks/TextBlock';

const RenderBlock = ({ block }: { block: Block }) => {
  if (block.type === 'column') {
    return <ColumnBlock block={block} />;
  }

  if (block.type === 'text') {
    return <TextBlock block={block} />;
  }

  return null; // Unknown block type
};

export default RenderBlock;
