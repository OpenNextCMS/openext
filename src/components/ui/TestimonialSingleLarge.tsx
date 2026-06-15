'use client';

import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';

export const TestimonialSingleLarge = ({ block, isEditing = false }: BlockRendererProps) => {
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
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <EditableElement
          block={block}
          isEditing={isEditing}
          path="cardStyle"
          className="xl:w-1/2 lg:w-3/4 w-full mx-auto text-center"
        >
          <EditableElement
            block={block}
            isEditing={isEditing}
            path="iconStyle"
            className="inline-block w-8 h-8 text-[color:var(--color-muted,#9ca3af)] mb-8"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-full h-full" viewBox="0 0 975.036 975.036">
              <path d="M925.036 57.197h-304c-27.6 0-50 22.4-50 50v304c0 27.601 22.4 50 50 50h145.5c-1.9 79.601-20.4 143.3-55.4 191.2-27.6 37.8-69.399 69.1-125.3 93.8-25.7 11.3-36.8 41.7-24.8 67.101l36 76c11.6 24.399 40.3 35.1 65.1 24.399 66.2-28.6 122.101-64.8 167.7-108.8 55.601-53.7 93.7-114.3 114.3-181.9 20.601-67.6 30.9-159.8 30.9-276.8v-239c0-27.599-22.401-50-50-50zM106.036 913.497c65.4-28.5 121-64.699 166.9-108.6 56.1-53.7 94.4-114.1 115-181.2 20.6-67.1 30.899-159.6 30.899-277.5v-239c0-27.6-22.399-50-50-50h-304c-27.6 0-50 22.4-50 50v304c0 27.601 22.4 50 50 50h145.5c-1.9 79.601-20.4 143.3-55.4 191.2-27.6 37.8-69.4 69.1-125.3 93.8-25.7 11.3-36.8 41.7-24.8 67.101l35.9 75.8c11.601 24.399 40.501 35.2 65.301 24.399z"></path>
            </svg>
          </EditableElement>
          <InlineEditableText
            tagName="p"
            value={content.text || "Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware. Man bun next level coloring book skateboard four loko knausgaard. Kitsch keffiyeh master cleanse direct trade indigo juice before they sold out gentrify plaid gastropub normcore XOXO 90's pickled cindigo jean shorts. Slow-carb next level shoindigoitch ethical authentic, yr scenester sriracha forage franzen organic drinking vinegar."}
            onBlur={(v) => handleUpdate('text', v)}
            isEditing={isEditing}
            className="leading-relaxed text-lg"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
              fontFamily: block.style?.fontFamily,
              ...content.quoteStyle 
            }}
          />
          <span className="inline-block h-1 w-10 rounded bg-[var(--color-primary,#6366f1)] mt-8 mb-6"></span>
          <InlineEditableText
            tagName="h2"
            value={content.name || 'HOLDEN CAULFIELD'}
            onBlur={(v) => handleUpdate('name', v)}
            isEditing={isEditing}
            className="text-[color:var(--color-text,#111827)] font-medium title-font tracking-wider text-sm uppercase"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
              fontFamily: block.style?.fontFamily,
              ...content.nameStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.role || 'Senior Product Designer'}
            onBlur={(v) => handleUpdate('role', v)}
            isEditing={isEditing}
            className="text-[color:var(--color-muted,#6b7280)]"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
              fontFamily: block.style?.fontFamily,
              ...content.roleStyle
            }}
          />
        </EditableElement>
      </div>
    </section>
  );
};
