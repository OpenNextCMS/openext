import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps, BlockData } from '@/types/index';

export const HeroCentered = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const handleSelect = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Hero Centered'));
  };

  return (
    <section 
      className="text-gray-600 body-font w-full" 
      style={block.style}
      onClick={handleSelect}
    >
      <div className="container mx-auto flex px-5 py-24 items-center justify-center flex-col">
        <img className="lg:w-2/6 md:w-3/6 w-5/6 mb-10 object-cover object-center rounded" alt="hero" src={content.image || "https://dummyimage.com/720x600"} />
        <div className="text-center lg:w-2/3 w-full">
          <InlineEditableText
            tagName="h1"
            className="title-font sm:text-4xl text-3xl mb-4 font-medium text-gray-900 whitespace-pre-line"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
            }}
            value={content.title || 'Microdosing synth tattooed vexillologist'}
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
            value={content.description || 'Meggings kinfolk echo park stumptown DIY, kale chips beard jianbing tousled. Chambray dreamcatcher trust fund, kitsch vice godard disrupt ramps hexagon mustache umami snackwave tilde chillwave ugh. Pour-over meditation PBR&B pickled ennui celiac mlkshk freegan photo booth af fingerstache pitchfork.'}
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
      </div>
    </section>
  );
};
