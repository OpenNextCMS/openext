'use client';

import type { BlockRendererProps } from '@/types/index';
import { ColumnBlock } from './blocks/ColumnBlock';
import { TextBlock } from './blocks/TextBlock';
import { StatsBlock } from './blocks/StatsBlock';
import { ProgressBarBlock } from './blocks/ProgressBarBlock';
import { CountdownBlock } from './blocks/CountdownBlock';
import { RowBlock } from './blocks/RowBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { IconBlock } from './blocks/IconBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { CardBlock } from './blocks/CardBlock';
import { ShapeDividerBlock } from './blocks/ShapeDividerBlock';

const RenderBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  if (block.type === 'column') {
    return <ColumnBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'row') {
    return <RowBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'button') {
    return <ButtonBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'icon') {
    return <IconBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'image') {
    return <ImageBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'card') {
    return <CardBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'shape-divider') {
    return <ShapeDividerBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'text') {
    return <TextBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'stats') {
    return <StatsBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'progress') {
    return <ProgressBarBlock block={block} isEditing={isEditing} />;
  }

  if (block.type === 'countdown') {
    return <CountdownBlock block={block} isEditing={isEditing} />;
  }

  return null; // Unknown block type
};

export default RenderBlock;
