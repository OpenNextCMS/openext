import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const EcommerceInfo = ({ block, isEditing = false }: BlockRendererProps) => {
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

  return (
    <section className="text-[color:var(--color-muted,#4b5563)] body-font overflow-hidden w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="lg:w-4/5 mx-auto flex flex-wrap">
          <EditableElement
            block={block}
            isEditing={isEditing}
            path="cardStyle"
            className="lg:w-1/2 w-full lg:pr-10 lg:py-6 mb-6 lg:mb-0"
          >
            <InlineEditableText
              tagName="h2"
              value={content.brand || 'BRAND NAME'}
              onBlur={(v) => handleUpdate('brand', v)}
              isEditing={isEditing}
              className="text-sm title-font text-[color:var(--color-muted,#6b7280)] tracking-widest uppercase"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
                fontFamily: block.style?.fontFamily,
                ...content.brandStyle 
              }}
            />
            <InlineEditableText
              tagName="h1"
              value={content.title || 'Product Title'}
              onBlur={(v) => handleUpdate('title', v)}
              isEditing={isEditing}
              className="text-[color:var(--color-text,#111827)] text-3xl title-font font-medium mb-4"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
                fontFamily: block.style?.fontFamily,
                ...content.titleStyle 
              }}
            />
            <div className="flex mb-4">
              <a className="flex-grow text-[color:var(--color-primary,#6366f1)] border-b-2 border-indigo-500 py-2 text-lg px-1 cursor-pointer" style={{ fontFamily: block.style?.fontFamily }}>Description</a>
              <a className="flex-grow border-b-2 border-gray-300 py-2 text-lg px-1 cursor-pointer" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>Reviews</a>
              <a className="flex-grow border-b-2 border-gray-300 py-2 text-lg px-1 cursor-pointer" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>Details</a>
            </div>
            <InlineEditableText
              tagName="p"
              value={content.description || 'Product description goes here...'}
              onBlur={(v) => handleUpdate('description', v)}
              isEditing={isEditing}
              className="leading-relaxed mb-4"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
                fontFamily: block.style?.fontFamily,
                ...content.descriptionStyle 
              }}
            />
            <div className="flex border-t border-gray-200 py-2">
              <span className="text-[color:var(--color-muted,#6b7280)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>Color</span>
              <span className="ml-auto text-[color:var(--color-text,#111827)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>{content.color || 'Blue'}</span>
            </div>
            <div className="flex border-t border-gray-200 py-2">
              <span className="text-[color:var(--color-muted,#6b7280)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>Size</span>
              <span className="ml-auto text-[color:var(--color-text,#111827)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>{content.size || 'Medium'}</span>
            </div>
            <div className="flex border-t border-b mb-6 border-gray-200 py-2">
              <span className="text-[color:var(--color-muted,#6b7280)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>Quantity</span>
              <span className="ml-auto text-[color:var(--color-text,#111827)]" style={{ color: block.style?.color || 'var(--color-text, #111827)', fontFamily: block.style?.fontFamily }}>{content.quantity || '4'}</span>
            </div>
            <div className="flex">
              <InlineEditableText
                tagName="span"
                value={content.price || '$0.00'}
                onBlur={(v) => handleUpdate('price', v)}
                isEditing={isEditing}
                className="title-font font-medium text-2xl text-[color:var(--color-text,#111827)]"
                style={{ 
                  color: block.style?.color || 'var(--color-text, #111827)', 
                  fontFamily: block.style?.fontFamily,
                  ...content.priceStyle 
                }}
              />
              <EditableElement
                as="button"
                block={block}
                isEditing={isEditing}
                path="buttonStyle"
                className="flex ml-auto text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-6 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded"
                baseStyle={{ fontFamily: block.style?.fontFamily }}
              >
                <InlineEditableText
                  value={content.buttonText || 'Button'}
                  onBlur={(v) => handleUpdate('buttonText', v)}
                  isEditing={isEditing}
                  tagName="span"
                />
              </EditableElement>
              <button className="rounded-full w-10 h-10 bg-[var(--color-surface,#e5e7eb)] p-0 border-0 inline-flex items-center justify-center text-[color:var(--color-muted,#6b7280)] ml-4">
                <svg fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"></path>
                </svg>
              </button>
            </div>
          </EditableElement>
          <EditableElement
            as="img"
            block={block}
            isEditing={isEditing}
            path="imageStyle"
            className="lg:w-1/2 w-full lg:h-auto h-64 object-cover object-center rounded"
            extraProps={{ alt: "ecommerce", src: content.image || "https://dummyimage.com/400x400" }}
          />
        </div>
      </div>
    </section>
  );
};
