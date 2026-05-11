'use client';

import { useState } from 'react';
import { Keyboard, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedBlock,
  setSelectedLabel,
  updateBlockContent,
} from '@/redux/canvasSlice';

interface InputContent {
  label: string;
  placeholder: string;
  name: string;
  inputType: string;
  required: boolean;
  labelStyle?: React.CSSProperties;
}

const defaultInputContent: InputContent = {
  label: 'Your Name',
  placeholder: 'Enter your name',
  name: 'your_name',
  inputType: 'text',
  required: false,
  labelStyle: {
    color: '#111827',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginBottom: '6px',
    textAlign: 'left',
  },
};

const parseInputContent = (content?: string): InputContent => {
  if (!content || !content.startsWith('{')) return defaultInputContent;

  try {
    return { ...defaultInputContent, ...JSON.parse(content) };
  } catch {
    return defaultInputContent;
  }
};

export const InputBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [value, setValue] = useState('');
  const inputContent = parseInputContent(block.content);
  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#111827',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginBottom: '6px',
    textAlign: 'left',
    ...inputContent.labelStyle,
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isEditing) return;
    dispatch(setSelectedLabel('Input Box'));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const handleLabelBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!isEditing || !block.uniqueId) return;

    dispatch(
      updateBlockContent({
        id: block.uniqueId,
        content: JSON.stringify({
          ...inputContent,
          label: e.currentTarget.innerText.trim(),
        }),
      })
    );
  };

  return (
    <div
      className="relative mb-4"
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: block.style?.width || '100%' }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <Keyboard className="h-3 w-3" />
          <span>Input Box</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={handleRemove}
            className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
            title="Delete input box"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {(isEditing || inputContent.label) && (
        <label htmlFor={block.uniqueId} style={labelStyle}>
          <span
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleLabelBlur}
            onClick={(e) => e.stopPropagation()}
            style={{
              cursor: isEditing ? 'text' : 'inherit',
              outline: 'none',
            }}
          >
            {inputContent.label || 'Label'}
          </span>
          {inputContent.required ? ' *' : ''}
        </label>
      )}

      <Input
        id={block.uniqueId}
        name={inputContent.name}
        type={inputContent.inputType}
        required={inputContent.required}
        placeholder={inputContent.placeholder}
        value={isEditing ? '' : value}
        readOnly={isEditing}
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => {
          if (isEditing) e.preventDefault();
        }}
        style={{
          width: '100%',
          outline: 'none',
          ...block.style,
          cursor: isEditing ? 'pointer' : 'text',
          border:
            isHovered && isEditing
              ? '1px solid #3b82f6'
              : block.style?.border || '1px solid #d1d5db',
        }}
      />
    </div>
  );
};
