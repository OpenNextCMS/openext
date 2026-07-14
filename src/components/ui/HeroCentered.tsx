import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { InlineSlot } from '@/components/editor/blocks/InlineSlot';
import { isPartHidden } from '@/lib/editor/stylePath';
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
      className="text-[color:var(--color-muted,#4b5563)] body-font w-full" 
      style={block.style}
      onClick={handleSelect}
    >
      <div className="container mx-auto flex px-5 py-24 items-center justify-center flex-col">
        {/* Insert blocks above the image */}
        <InlineSlot block={block} slotIndex={2} isEditing={isEditing} />
        <img className="lg:w-2/6 md:w-3/6 w-5/6 mb-10 object-cover object-center rounded" alt="hero" src={content.image || "https://dummyimage.com/720x600"} />
        <div className="text-center lg:w-2/3 w-full">
          {/* Insert blocks between the image and the heading */}
          <InlineSlot block={block} slotIndex={3} isEditing={isEditing} />
          {!isPartHidden(content, 'titleStyle') && (
            <InlineEditableText
              tagName="h1"
              className="title-font sm:text-4xl text-3xl mb-4 font-medium text-[color:var(--color-text,#111827)] whitespace-pre-line"
              style={{
                color: block.style?.color || 'var(--color-text, #111827)',
                fontFamily: block.style?.fontFamily,
                ...content.titleStyle
              }}
              value={content.title || 'Microdosing synth tattooed vexillologist'}
              onBlur={(v) => handleUpdate('title', v)}
              isEditing={isEditing}
            />
          )}
          {!isPartHidden(content, 'descriptionStyle') && (
            <InlineEditableText
              tagName="p"
              className="mb-8 leading-relaxed"
              style={{
                color: block.style?.color || 'var(--color-text, #111827)',
                fontFamily: block.style?.fontFamily,
                ...content.descriptionStyle
              }}
              value={content.description || 'Meggings kinfolk echo park stumptown DIY, kale chips beard jianbing tousled. Chambray dreamcatcher trust fund, kitsch vice godard disrupt ramps hexagon mustache umami snackwave tilde chillwave ugh. Pour-over meditation PBR&B pickled ennui celiac mlkshk freegan photo booth af fingerstache pitchfork.'}
              onBlur={(v) => handleUpdate('description', v)}
              isEditing={isEditing}
            />
          )}
          {/* Insert blocks between the description and the buttons */}
          <InlineSlot block={block} slotIndex={4} isEditing={isEditing} />
          <div className="flex justify-center">
            {!isPartHidden(content, 'primaryButtonStyle') && (
              <button
                className="inline-flex text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-6 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-lg"
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
            )}
            {!isPartHidden(content, 'secondaryButtonStyle') && (
              <button
                className="ml-4 inline-flex text-[color:var(--color-muted,#374151)] bg-[var(--color-surface,#f3f4f6)] border-0 py-2 px-6 focus:outline-none hover:bg-[var(--color-surface,#e5e7eb)] rounded text-lg"
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
            )}
          </div>
          {/* Insert blocks after the buttons */}
          <InlineSlot block={block} slotIndex={5} isEditing={isEditing} />
        </div>
      </div>
    </section>
  );
};
