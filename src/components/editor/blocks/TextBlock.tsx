'use client';

import { Edit2, Trash2 } from 'lucide-react';
import { BlockRendererProps } from '@/types/index';
import { getIconForBlock } from './icons';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';

export const TextBlock = ({ block }: BlockRendererProps) => {
  const dispatch = useAppDispatch();

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId));
  };

  return (
    <div className="relative group mb-4">
      <div className="absolute -top-3 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {getIconForBlock(block.icon)}
        <span className="ml-1">Text Block</span>
      </div>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
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
      <div className="p-4 border rounded-lg shadow-sm group-hover:shadow-md transition-all group-hover:border-primary">
        {block.content}
      </div>
    </div>
  );
};
