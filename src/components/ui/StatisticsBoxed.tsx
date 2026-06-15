'use client';

import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
<<<<<<< HEAD
import { EditableElement } from '@/components/editor/EditableElement';
=======
>>>>>>> khadija
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';

import { renderSelectedIcon } from '@/components/editor/data/iconOptions';

export const StatisticsBoxed = ({ block, isEditing = false }: BlockRendererProps) => {
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
    { value: '2.7K', label: 'Downloads', icon: 'download' },
    { value: '1.3K', label: 'Users', icon: 'heart' },
    { value: '74', label: 'Files', icon: 'pen-tool' },
    { value: '46', label: 'Places', icon: 'globe' },
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

  const updateStat = (index: number, key: 'value' | 'label' | 'icon', value: string) => {
    if (!isEditing) return;
    const newStats = [...stats];
    newStats[index] = { ...newStats[index], [key]: value };
    handleUpdate('stats', newStats);
  };

  return (
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
>>>>>>> khadija
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col text-center w-full mb-20">
          <InlineEditableText
            tagName="h1"
            value={content.mainTitle || 'Master Cleanse Reliac Heirloom'}
            onBlur={(v) => handleUpdate('mainTitle', v)}
            isEditing={isEditing}
<<<<<<< HEAD
            className="sm:text-3xl text-2xl font-medium title-font mb-4 text-[color:var(--color-text,#111827)]"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
            className="sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900"
            style={{ 
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.mainTitleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.mainDescription || "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag."}
            onBlur={(v) => handleUpdate('mainDescription', v)}
            isEditing={isEditing}
            className="lg:w-2/3 mx-auto leading-relaxed text-base"
            style={{ 
<<<<<<< HEAD
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.mainDescriptionStyle 
            }}
          />
        </div>
        <div className="flex flex-wrap -m-4 text-center">
          {stats.map((stat: BlockContentItem, index: number) => (
            <div key={index} className="p-4 md:w-1/4 sm:w-1/2 w-full">
<<<<<<< HEAD
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`stats.${index}.cardStyle`}
                className="border-2 border-gray-200 px-4 py-6 rounded-lg"
              >
                <EditableElement
                  block={block}
                  isEditing={isEditing}
                  path={`stats.${index}.iconStyle`}
                  className="text-[color:var(--color-primary,#6366f1)] flex justify-center mb-3"
                >
                  {renderSelectedIcon(stat.icon, "w-12 h-12")}
                </EditableElement>
=======
              <div className="border-2 border-gray-200 px-4 py-6 rounded-lg">
                <div className="text-indigo-500 flex justify-center mb-3">
                  {renderSelectedIcon(stat.icon, "w-12 h-12")}
                </div>
>>>>>>> khadija
                <InlineEditableText
                  tagName="h2"
                  value={stat.value}
                  onBlur={(v) => updateStat(index, 'value', v)}
                  isEditing={isEditing}
<<<<<<< HEAD
                  className="title-font font-medium text-3xl text-[color:var(--color-text,#111827)]"
                  style={{
                    color: block.style?.color || 'var(--color-text, #111827)',
                    fontFamily: block.style?.fontFamily,
                    ...content.valueStyle
=======
                  className="title-font font-medium text-3xl text-gray-900"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.valueStyle 
>>>>>>> khadija
                  }}
                />
                <InlineEditableText
                  tagName="p"
                  value={stat.label}
                  onBlur={(v) => updateStat(index, 'label', v)}
                  isEditing={isEditing}
                  className="leading-relaxed"
<<<<<<< HEAD
                  style={{
                    color: block.style?.color || 'var(--color-text, #111827)',
                    fontFamily: block.style?.fontFamily,
                    ...content.labelStyle
                  }}
                />
              </EditableElement>
=======
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.labelStyle 
                  }}
                />
              </div>
>>>>>>> khadija
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
