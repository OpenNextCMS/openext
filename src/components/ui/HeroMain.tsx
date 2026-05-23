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
            className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-900 whitespace-pre-line"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
            }}
            value={content.title || 'Before they sold out\nreadymade gluten'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
          />
          <InlineEditableText
            tagName="p"
            className="mb-8 leading-relaxed"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
            }}
            value={content.description || 'Copper mug try-hard pitchfork pour-over freegan heirloom neutra air plant cold-pressed tacos poke beard tote bag. Heirloom echo park mlkshk tote bag selvage hot chicken authentic tumeric truffaut hexagon try-hard chambray.'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
          />
          <div className="flex justify-center">
            <button 
              className="inline-flex text-white bg-indigo-500 border-0 py-2 px-6 focus:outline-none hover:bg-indigo-600 rounded text-lg" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.primaryButtonStyle 
              }}
            >
              <InlineEditableText
                value={content.primaryButtonText || 'Button'}
                onBlur={(v) => handleUpdate('primaryButtonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
            </button>
            <button 
              className="ml-4 inline-flex text-gray-700 bg-gray-100 border-0 py-2 px-6 focus:outline-none hover:bg-gray-200 rounded text-lg" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.secondaryButtonStyle 
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
