'use client';

import { GripVertical, Edit2, Trash2, Heart } from 'lucide-react';
import { BlockRendererProps } from '@/types/index';
import { getIconForBlock } from './icons';
import { ColumnDropZone } from './ColumnDropZone';
import RenderBlock from '../renderblock';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';

export const ColumnBlock = ({ block }: BlockRendererProps) => {
  const dispatch = useAppDispatch();

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  // Ensure style is treated as a string
  const blockStyle = typeof block.style === 'string' ? block.style : '';

  return (
    <div className={`relative group mb-6 ${blockStyle}`}>
      <div className="absolute -top-3 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {getIconForBlock(block.icon as string | undefined)}
        <span className="ml-1">Column Layout</span>
      </div>
      <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
        <button className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded hover:bg-primary/90 transition-colors">
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded hover:bg-destructive/90 transition-colors"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
        <button className="bg-primary text-primary-foreground text-xs p-2 rounded-full hover:bg-primary/90 transition-colors hover:text-yellow-500">
          <Heart className="h-4 w-4" />
        </button>
      </div>
      <div className="flex gap-4 border p-4 rounded-lg shadow-sm group-hover:shadow-md transition-all group-hover:border-primary">
        {block.children?.map((childBlocks, index) => (
          <ColumnDropZone key={`${block.uniqueId}-col-${index}`} columnIndex={index} block={block}>
            {Array.isArray(childBlocks) && childBlocks.length > 0 ? (
              childBlocks.map((child) => <RenderBlock key={child.uniqueId} block={child} />)
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                <GripVertical className="h-5 w-5 mb-2" />
                <p className="text-sm">Drop blocks here</p>
              </div>
            )}
          </ColumnDropZone>
        ))}
      </div>
    </div>
  );
};