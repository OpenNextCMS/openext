'use client';

import { Edit2, Trash2, Type } from 'lucide-react';
import { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedLabel,
  setSelectedValue,
  setSelectedBlock,
} from '@/redux/canvasSlice';
import { useState } from 'react';

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

export const TextBlock = ({ block }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleEdit = () => {
    const label = document.querySelector(`#label-${block.uniqueId} span`);
    if (label) {
      let a = 256;
      dispatch(setSelectedLabel(label.textContent || ''));
      dispatch(setSelectedValue(a));
      dispatch(setSelectedBlock(block));
    }
  };

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
        {getIconForBlock(block.label)}
        <span>Text Block</span>
      </div>

      <div
        id={`actions-${block.uniqueId}`}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
        }}
      >
        <button
          onClick={handleEdit}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
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
          }}
        >
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div
        style={{
          ...block.style,
          border: isHovered ? '1px solid rgb(252, 252, 252)' : block.style?.border || 'none',
        }}
      >
        {block.content}
      </div>
    </div>
  );
};
