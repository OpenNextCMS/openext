'use client';

import { Trash2, Activity } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel, updateBlockContent } from '@/redux/canvasSlice';
import { useState } from 'react';
import { useBlockEvents } from '@/hooks/useBlockEvents';

export const ProgressBarBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Progress Bar'));
  };

  const content = block.content && block.content.startsWith('{') 
    ? JSON.parse(block.content) 
    : { label: block.content || 'Delivery Rate', percentage: 100, barColor: '#22d3ee' };

  const handleTextBlur = (key: 'label' | 'percentage', value: string) => {
    if (!isEditing) return;
    
    // Create a new content object by merging updates into the existing one
    const updatedContent = { 
      label: content.label,
      percentage: content.percentage,
      barColor: content.barColor || '#22d3ee'
    };

    if (key === 'percentage') {
      // Remove any % signs and parse as integer
      updatedContent.percentage = parseInt(value.replace('%', '')) || 0;
    } else {
      updatedContent.label = value;
    }

    dispatch(updateBlockContent({ 
      id: block.uniqueId ?? '', 
      content: JSON.stringify(updatedContent) 
    }));
  };

  return (
    <div
      onClick={handleSelect}
      className="relative mb-6 group transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...block.style,
        backgroundColor: 'transparent', // Resetting background for the outer wrapper here
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-10">
          <Activity className="w-3 h-3" />
          <span>Progress</span>
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
        className="transition-all h-full"
      >
        <div className="flex justify-between items-end mb-2 gap-4">
          <div 
            className={`text-xl font-medium outline-none min-h-[1.5rem] min-w-[20px] ${isEditing && !content.label ? 'bg-blue-500/10 border border-dashed border-blue-500/30 rounded px-2' : ''}`}
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleTextBlur('label', e.currentTarget.textContent || '')}
            style={{ 
              color: block.style?.color || '#22d3ee',
              fontSize: block.style?.fontSize,
              fontWeight: block.style?.fontWeight
            }}
          >
            {content.label}
          </div>
          <div 
            className="text-xl font-medium outline-none whitespace-nowrap"
            contentEditable={isEditing}
            suppressContentEditableWarning={true}
            onBlur={(e) => handleTextBlur('percentage', e.currentTarget.textContent || '')}
            style={{ 
              color: block.style?.color || '#ffffff',
              fontSize: block.style?.fontSize,
              fontWeight: block.style?.fontWeight
            }}
          >
            {content.percentage}%
          </div>
        </div>
        <div 
          className="w-full bg-gray-700 h-2 rounded-full overflow-hidden"
          style={{
            backgroundColor: block.style?.backgroundColor && block.style?.backgroundColor !== 'transparent' ? 'transparent' : undefined
          }}
        >
          <div 
            className="h-full rounded-full transition-all duration-1000" 
            style={{ 
              width: `${content.percentage}%`,
              backgroundColor: content.barColor || '#22d3ee' 
            }}
          />
        </div>
      </div>
    </div>
  );
};
