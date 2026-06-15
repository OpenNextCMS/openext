import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
<<<<<<< HEAD
import { EditableElement } from '@/components/editor/EditableElement';
=======
>>>>>>> khadija
import type { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureChecklist = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const updateItem = (index: number, value: string) => {
    if (!isEditing) return;
    const currentItems = [...items];
    currentItems[index] = value;
    handleUpdate('items', currentItems);
  };

  const items = content.items || [
    'Authentic Cliche Forage',
    'Kinfolk Chips Snackwave',
    'Coloring Book Ethical',
    'Typewriter Polaroid Cray',
    'Pack Truffaut Blue',
    'The Catcher In The Rye',
  ];

  return (
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
>>>>>>> khadija
      <div className="container px-5 py-24 mx-auto">
        <div className="text-center mb-20">
          <InlineEditableText
            tagName="h1"
            value={content.mainTitle || 'Raw Denim Heirloom Man Braid'}
            onBlur={(v) => handleUpdate('mainTitle', v)}
            isEditing={isEditing}
<<<<<<< HEAD
            className="sm:text-3xl text-2xl font-medium text-center title-font text-[color:var(--color-text,#111827)] mb-4"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
            className="sm:text-3xl text-2xl font-medium text-center title-font text-gray-900 mb-4"
            style={{ 
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.mainTitleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.mainDescription || 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.'}
            onBlur={(v) => handleUpdate('mainDescription', v)}
            isEditing={isEditing}
            className="text-base leading-relaxed xl:w-2/4 lg:w-3/4 mx-auto"
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
        <div className="flex flex-wrap lg:w-4/5 sm:mx-auto sm:mb-2 -mx-2">
          {items.map((item: string, index: number) => (
            <div key={index} className="p-2 sm:w-1/2 w-full">
<<<<<<< HEAD
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`items.${index}.cardStyle`}
                className="bg-[var(--color-surface,#f3f4f6)] rounded flex p-4 h-full items-center"
              >
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="text-[color:var(--color-primary,#6366f1)] w-6 h-6 flex-shrink-0 mr-4" viewBox="0 0 24 24">
=======
              <div className="bg-gray-100 rounded flex p-4 h-full items-center">
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="text-indigo-500 w-6 h-6 flex-shrink-0 mr-4" viewBox="0 0 24 24">
>>>>>>> khadija
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
                  <path d="M22 4L12 14.01l-3-3"></path>
                </svg>
                <InlineEditableText
                  tagName="span"
                  value={item || 'Checklist Item'}
                  onBlur={(v) => updateItem(index, v)}
                  isEditing={isEditing}
                  className="title-font font-medium"
<<<<<<< HEAD
                  style={{
                    color: block.style?.color || 'var(--color-text, #111827)',
                    fontFamily: block.style?.fontFamily,
                    ...content.itemTextStyle
                  }}
                />
              </EditableElement>
=======
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.itemTextStyle 
                  }}
                />
              </div>
>>>>>>> khadija
            </div>
          ))}
        </div>
        <a 
          href={isEditing ? undefined : content.buttonUrl || '#'}
<<<<<<< HEAD
          className="flex mx-auto mt-16 text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-8 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-lg text-center w-max" 
=======
          className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center w-max" 
>>>>>>> khadija
          style={{ 
            fontFamily: block.style?.fontFamily,
            ...content.buttonStyle 
          }}
          onClick={(e) => isEditing && e.preventDefault()}
        >
          <InlineEditableText
            tagName="span"
            value={content.buttonText || 'Button'}
            onBlur={(v) => handleUpdate('buttonText', v)}
            isEditing={isEditing}
          />
        </a>
      </div>
    </section>
  );
};
