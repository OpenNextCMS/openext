'use client';

import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';

export const StatisticsSideImage = ({ block, isEditing = false }: BlockRendererProps) => {
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
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <div className="flex flex-wrap -mx-4 mt-auto mb-auto lg:w-1/2 sm:w-2/3 content-start sm:pr-10">
          <div className="w-full sm:p-4 px-4 mb-6">
            <InlineEditableText
              tagName="h1"
              value={content.title || 'Moon hashtag pop-up try-hard offal truffaut'}
              onBlur={(v) => handleUpdate('title', v)}
              isEditing={isEditing}
              className="title-font font-medium text-xl mb-2 text-gray-900"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.titleStyle 
              }}
            />
            <InlineEditableText
              tagName="div"
              value={content.description || 'Pour-over craft beer pug drinking vinegar live-edge gastropub, keytar neutra sustainable fingerstache kickstarter.'}
              onBlur={(v) => handleUpdate('description', v)}
              isEditing={isEditing}
              className="leading-relaxed"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.descriptionStyle 
              }}
            />
          </div>
          {stats.map((stat: BlockContentItem, index: number) => (
            <div key={index} className="p-4 sm:w-1/2 lg:w-1/4 w-1/2">
              <InlineEditableText
                tagName="h2"
                value={stat.value}
                onBlur={(v) => updateStat(index, 'value', v)}
                isEditing={isEditing}
                className="title-font font-medium text-3xl text-gray-900"
                style={{ 
                  color: block.style?.color, 
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
                  color: block.style?.color, 
                  fontFamily: block.style?.fontFamily,
                  ...content.labelStyle 
                }}
              />
            </div>
          ))}
        </div>
        <div className="lg:w-1/2 sm:w-1/3 w-full rounded-lg overflow-hidden mt-6 sm:mt-0">
          <img 
            className="object-cover object-center w-full h-full" 
            src={content.image || "https://dummyimage.com/600x300"} 
            alt="stats" 
          />
        </div>
      </div>
    </section>
  );
};
