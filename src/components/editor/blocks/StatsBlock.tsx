'use client';

import { Trash2, Hash } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel, updateBlockContent } from '@/redux/canvasSlice';
import { useState } from 'react';
import { useBlockEvents } from '@/hooks/useBlockEvents';

export const StatsBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Stats Block'));
  };

  let content;
  try {
    content = block.content && block.content.startsWith('{') 
      ? JSON.parse(block.content) 
      : { value: block.content || '200+', label: 'Project Delivered' };
  } catch {
    content = { value: '200+', label: 'Project Delivered' };
  }

  // Sanitize value (remove trailing '{' or other JSON artifacts if they somehow leaked)
  if (typeof content.value === 'string') {
    content.value = content.value.replace(/[{}]$/, '').trim();
  }

  const handleTextBlur = (key: 'value' | 'label', newValue: string) => {
    if (!isEditing) return;
    const updatedContent = { ...content, [key]: newValue };
    dispatch(updateBlockContent({ 
      id: block.uniqueId ?? '', 
      content: JSON.stringify(updatedContent) 
    }));
  };

  return (
    <div
      onClick={handleSelect}
      className="relative mb-4 group cursor-pointer transition-all w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...block.style,
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
        wordBreak: 'break-word'
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-10">
          <Hash className="w-3 h-3" />
          <span>Stats</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button onClick={handleRemove} className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      <div
        className="h-full flex flex-col"
      >
        <div 
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 outline-none break-words"
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onBlur={(e) => handleTextBlur('value', e.currentTarget.textContent || '')}
        >
          {content.value}
        </div>
        <div 
          className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider outline-none break-words"
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onBlur={(e) => handleTextBlur('label', e.currentTarget.textContent || '')}
        >
          {content.label}
        </div>
      </div>
    </div>
  );
};
