'use client';

import { useState } from 'react';
import { CircleDot, SquareCheck, Trash2 } from 'lucide-react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import {
  removeBlock,
  setSelectedBlock,
  setSelectedLabel,
  updateBlockContent,
} from '@/redux/canvasSlice';

interface ChoiceContent {
  label: string;
  name: string;
  value: string;
  checked: boolean;
  required: boolean;
  labelStyle?: React.CSSProperties;
}

const defaultChoiceContent: ChoiceContent = {
  label: 'Option',
  name: 'choice_group',
  value: 'option',
  checked: false,
  required: false,
  labelStyle: {
    color: 'var(--color-text, #111827)',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginLeft: '8px',
    textAlign: 'left',
  },
};

const parseChoiceContent = (content?: string): ChoiceContent => {
  if (!content || !content.startsWith('{')) return defaultChoiceContent;

  try {
    return { ...defaultChoiceContent, ...JSON.parse(content) };
  } catch {
    return defaultChoiceContent;
  }
};

export const ChoiceInputBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [checked, setChecked] = useState(false);
  const choiceContent = parseChoiceContent(block.content);
  const isRadio = block.type === 'radio';
  const blockLabel = isRadio ? 'Radio Button' : 'Check Button';
  const Icon = isRadio ? CircleDot : SquareCheck;
  const labelStyle: React.CSSProperties = {
    color: 'var(--color-text, #111827)',
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '1.4',
    marginLeft: '8px',
    textAlign: 'left',
    ...choiceContent.labelStyle,
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isEditing) return;
    dispatch(setSelectedLabel(blockLabel));
    dispatch(setSelectedBlock(block as BlockData));
  };

  const handleLabelBlur = (e: React.FocusEvent<HTMLSpanElement>) => {
    if (!isEditing || !block.uniqueId) return;

    dispatch(
      updateBlockContent({
        id: block.uniqueId,
        content: JSON.stringify({
          ...choiceContent,
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
      style={{
        display: 'flex',
        alignItems: 'center',
        width: block.style?.width || 'auto',
        ...block.style,
        border:
          isHovered && isEditing
            ? '1px solid #3b82f6'
            : block.style?.border || '1px solid transparent',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <Icon className="h-3 w-3" />
          <span>{blockLabel}</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={handleRemove}
            className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
            title={`Delete ${blockLabel.toLowerCase()}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      <input
        id={block.uniqueId}
        name={choiceContent.name}
        type={isRadio ? 'radio' : 'checkbox'}
        value={choiceContent.value}
        required={choiceContent.required}
        checked={isEditing ? choiceContent.checked : checked}
        readOnly={isEditing}
        onChange={(e) => setChecked(e.target.checked)}
        onClick={(e) => {
          if (isEditing) e.preventDefault();
        }}
        style={{
          width: '16px',
          height: '16px',
          cursor: isEditing ? 'pointer' : 'pointer',
          accentColor: '#2563eb',
        }}
      />

      {(isEditing || choiceContent.label) && (
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
            {choiceContent.label || 'Label'}
          </span>
          {choiceContent.required ? ' *' : ''}
        </label>
      )}
    </div>
  );
};
