'use client';

import type React from 'react';

import { useState } from 'react';
import { Edit2, Trash2, Type } from 'lucide-react';
import type { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';
// import { updateBlockContent } from '@/redux/canvasSlice'; // Optional for saving edits

const getIconForBlock = (icon?: string) => {
  switch (icon) {
    case 'edit':
      return <Edit2 style={{ width: 14, height: 14 }} />;
    case 'delete':
      return <Trash2 style={{ width: 14, height: 14 }} />;
    default:
      return <Type style={{ width: 14, height: 14 }} />;
  }
};

interface Props extends BlockRendererProps {
  isEditing?: boolean;
}

export const TextBlock = ({ block, isEditing = false }: Props) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [content, setContent] = useState(block.content || '');

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const updatedContent = e.currentTarget.innerText;
    setContent(updatedContent);
    // dispatch(updateBlockContent({ id: block.uniqueId, content: updatedContent }));
  };

  // If not in editing mode, use a simplified view with just a p tag
  if (!isEditing) {
    return (
      <p
        style={{
          ...block.style,
          border: 'none', // override static border
          margin: '0',
          padding: '0',
        }}
      >
        {content}
      </p>
    );
  }
  // Editing mode with all controls and structure
  return (
    <div
      style={{ position: 'relative', marginBottom: '1rem' }}
      onMouseEnter={() => {
        setIsHovered(true);
        const label = document.getElementById(`label-${block.uniqueId}`);
        const actions = document.getElementById(`actions-${block.uniqueId}`);
        if (label) label.style.opacity = '1';
        if (actions) actions.style.opacity = '1';
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        const label = document.getElementById(`label-${block.uniqueId}`);
        const actions = document.getElementById(`actions-${block.uniqueId}`);
        if (label) label.style.opacity = '0';
        if (actions) actions.style.opacity = '0';
      }}
    >
      {/* Hover Label */}
      <div
        id={`label-${block.uniqueId}`}
        style={{
          position: 'absolute',
          top: '-12px',
          left: '8px',
          backgroundColor: '#3b82f6',
          color: 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
        }}
      >
        {getIconForBlock(block.icon as string | undefined)}
        <span>Text Block</span>
      </div>

      {/* Action Buttons */}
      <div
        id={`actions-${block.uniqueId}`}
        style={{
          position: 'absolute',
          top: '-13px',
          right: '0px',
          display: 'flex',
          gap: '6px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
        }}
      >
        <button
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Edit2 style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={handleRemove}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Text Content */}
      <div
        contentEditable={true}
        suppressContentEditableWarning
        onBlur={handleBlur}
        style={{
          ...block.style,
          minHeight: '30px',
          border: isEditing && isHovered ? '1px solid rgb(229, 231, 235)' : 'none', // Only show border when editing and hovered
          padding: '8px',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          cursor: 'text',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          borderRadius: '4px',
        }}
      >
        {content}
      </div>
    </div>
  );
};
