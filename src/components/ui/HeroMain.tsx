import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps } from '@/types/index';

export const HeroMain = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const handleUpdate = (key: string, newValue: string) => {
    if (!isEditing) return;
    const updatedContent = { ...content, [key]: newValue };
    dispatch(
      updateBlockContent({
        id: block.uniqueId ?? '',
        content: JSON.stringify(updatedContent),
      })
    );
  };

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container mx-auto flex px-5 py-24 md:flex-row flex-col items-center">
        <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
          <InlineEditableText
            tagName="h1"
<<<<<<< HEAD
            className="title-font sm:text-4xl text-3xl mb-4 font-medium whitespace-pre-line"
            style={{
              color: block.style?.color || 'var(--color-text, #111827)',
              fontFamily: block.style?.fontFamily || 'var(--font-heading)',
              ...content.titleStyle
=======
            className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-900 whitespace-pre-line"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
>>>>>>> khadija
            }}
            value={content.title || 'Before they sold out\nreadymade gluten'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
          />
          <InlineEditableText
            tagName="p"
            className="mb-8 leading-relaxed"
<<<<<<< HEAD
            style={{
              color: block.style?.color || 'var(--color-muted, #4b5563)',
              fontFamily: block.style?.fontFamily || 'var(--font-body)',
              ...content.descriptionStyle
=======
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
>>>>>>> khadija
            }}
            value={content.description || 'Copper mug try-hard pitchfork pour-over freegan heirloom neutra air plant cold-pressed tacos poke beard tote bag. Heirloom echo park mlkshk tote bag selvage hot chicken authentic tumeric truffaut hexagon try-hard chambray.'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
          />
          <div className="flex justify-center">
<<<<<<< HEAD
            <button
              className="inline-flex border-0 py-2 px-6 focus:outline-none text-lg"
              style={{
                backgroundColor: 'var(--color-primary, #6366f1)',
                color: 'var(--color-bg, #ffffff)',
                borderRadius: 'var(--radius-md, 0.25rem)',
                fontFamily: block.style?.fontFamily,
                ...content.primaryButtonStyle
=======
            <button 
              className="inline-flex text-white bg-indigo-500 border-0 py-2 px-6 focus:outline-none hover:bg-indigo-600 rounded text-lg" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.primaryButtonStyle 
>>>>>>> khadija
              }}
            >
              <InlineEditableText
                value={content.primaryButtonText || 'Button'}
                onBlur={(v) => handleUpdate('primaryButtonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
            </button>
<<<<<<< HEAD
            <button
              className="ml-4 inline-flex border-0 py-2 px-6 focus:outline-none text-lg"
              style={{
                backgroundColor: 'var(--color-surface, #f3f4f6)',
                color: 'var(--color-text, #374151)',
                borderRadius: 'var(--radius-md, 0.25rem)',
                fontFamily: block.style?.fontFamily,
                ...content.secondaryButtonStyle
=======
            <button 
              className="ml-4 inline-flex text-gray-700 bg-gray-100 border-0 py-2 px-6 focus:outline-none hover:bg-gray-200 rounded text-lg" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.secondaryButtonStyle 
>>>>>>> khadija
              }}
            >
              <InlineEditableText
                value={content.secondaryButtonText || 'Button'}
                onBlur={(v) => handleUpdate('secondaryButtonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
            </button>
          </div>
        </div>
        <div className="lg:max-w-lg lg:w-full md:w-1/2 w-5/6">
          <img className="object-cover object-center rounded" alt="hero" src={content.image || "https://dummyimage.com/720x600"} />
        </div>
      </div>
    </section>
  );
};
