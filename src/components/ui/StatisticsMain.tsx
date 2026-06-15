'use client';

import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';

export const StatisticsMain = ({ block, isEditing = false }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

  const stats = content.stats || [
    { value: '2.7K', label: 'Users' },
    { value: '1.8K', label: 'Subscribes' },
    { value: '35', label: 'Downloads' },
    { value: '4', label: 'Products' },
  ];

  const handleUpdate = (key: string, newValue: unknown) => {
    if (!isEditing) return;
    const updatedContent = { ...content, [key]: newValue };
    dispatch(
      updateBlockContent({
        id: block.uniqueId ?? '',
        content: JSON.stringify(updatedContent),
      })
    );
  };

  const updateStat = (index: number, key: 'value' | 'label', value: string) => {
    if (!isEditing) return;
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [key]: value };
    handleUpdate('stats', newStats);
  };

  return (
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -m-4 text-center">
          {stats.map((stat: BlockContentItem, index: number) => (
            <EditableElement
              key={index}
              block={block}
              isEditing={isEditing}
              path={`stats.${index}.cardStyle`}
              className="p-4 sm:w-1/4 w-1/2"
            >
              <InlineEditableText
                tagName="h2"
                value={stat.value}
                onBlur={(v) => updateStat(index, 'value', v)}
                isEditing={isEditing}
                className="title-font font-medium sm:text-4xl text-3xl text-[color:var(--color-text,#111827)]"
                style={{
                  color: block.style?.color || 'var(--color-text, #111827)',
                  fontFamily: block.style?.fontFamily,
                  ...content.valueStyle
                }}
              />
              <InlineEditableText
                tagName="p"
                value={stat.label}
                onBlur={(v) => updateStat(index, 'label', v)}
                isEditing={isEditing}
                className="leading-relaxed"
                style={{
                  color: block.style?.color || 'var(--color-text, #111827)',
                  fontFamily: block.style?.fontFamily,
                  ...content.labelStyle
                }}
              />
            </EditableElement>
          ))}
        </div>
      </div>
    </section>
  );
};
