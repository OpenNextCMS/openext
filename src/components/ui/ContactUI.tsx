import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps, BlockData } from '@/types/index';

export const ContactUI = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const handleSelect = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Contact UI'));
  };

  const mapUrl =
    content.mapUrl ||
    'https://maps.google.com/maps?width=100%&height=600&hl=en&q=%C4%B0zmir+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed';

  return (
    <section 
      className="text-[color:var(--color-muted,#4b5563)] body-font relative w-full min-h-[600px]" 
      style={block.style}
      onClick={handleSelect}
    >
      <div className="absolute inset-0 bg-[var(--color-surface,#d1d5db)]">
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="map"
          scrolling="no"
          src={mapUrl}
          style={{ filter: 'grayscale(1) contrast(1.2) opacity(0.4)' }}
        ></iframe>
      </div>
      <div className="container px-5 py-24 mx-auto flex">
        <EditableElement
          block={block}
          isEditing={isEditing}
          path="cardStyle"
          className="lg:w-1/3 md:w-1/2 bg-[var(--color-bg,#ffffff)] rounded-lg p-8 flex flex-col md:ml-auto w-full mt-10 md:mt-0 relative z-10 shadow-md"
          baseStyle={{ fontFamily: block.style?.fontFamily }}
        >
          <InlineEditableText
            tagName="h2"
            value={content.title || 'Feedback'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
            className="text-[color:var(--color-text,#111827)] text-lg mb-1 font-medium title-font"
            style={{ 
              fontFamily: block.style?.fontFamily,
              color: block.style?.color || 'var(--color-text, #111827)',
              ...content.titleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.description || 'Post-ironic portland shabby chic echo park, banjo fashion axe'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
            className="leading-relaxed mb-5 text-[color:var(--color-muted,#4b5563)]"
            style={{ 
              fontFamily: block.style?.fontFamily,
              color: block.style?.color || 'var(--color-text, #111827)',
              ...content.descriptionStyle 
            }}
          />
          <div className="relative mb-4">
            <InlineEditableText
              tagName="label"
              value={content.emailLabel || 'Email'}
              onBlur={(v) => handleUpdate('emailLabel', v)}
              isEditing={isEditing}
              className="leading-7 text-sm text-[color:var(--color-muted,#4b5563)]"
              style={{ 
                fontFamily: block.style?.fontFamily,
                color: block.style?.color || 'var(--color-text, #111827)',
                ...content.emailLabelStyle 
              }}
            />
            <input
              type="email"
              id="email"
              name="email"
              className="w-full bg-[var(--color-bg,#ffffff)] rounded border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-base outline-none text-[color:var(--color-muted,#374151)] py-1 px-3 leading-8 transition-colors duration-200 ease-in-out"
            />
          </div>
          <div className="relative mb-4">
            <InlineEditableText
              tagName="label"
              value={content.messageLabel || 'Message'}
              onBlur={(v) => handleUpdate('messageLabel', v)}
              isEditing={isEditing}
              className="leading-7 text-sm text-[color:var(--color-muted,#4b5563)]"
              style={{ 
                fontFamily: block.style?.fontFamily,
                color: block.style?.color || 'var(--color-text, #111827)',
                ...content.messageLabelStyle 
              }}
            />
            <textarea
              id="message"
              name="message"
              className="w-full bg-[var(--color-bg,#ffffff)] rounded border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 h-32 text-base outline-none text-[color:var(--color-muted,#374151)] py-1 px-3 resize-none leading-6 transition-colors duration-200 ease-in-out"
            ></textarea>
          </div>
          <EditableElement
            as="button"
            block={block}
            isEditing={isEditing}
            path="submitButtonStyle"
            className="text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-6 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-lg text-center"
            baseStyle={{ fontFamily: block.style?.fontFamily }}
            extraProps={{ type: 'button' }}
          >
            <InlineEditableText
              tagName="span"
              value={content.buttonText || 'Button'}
              onBlur={(v) => handleUpdate('buttonText', v)}
              isEditing={isEditing}
              style={content.buttonStyle}
            />
          </EditableElement>
          <InlineEditableText
            tagName="p"
            value={content.footerText || 'Chicharrones blog helvetica normcore iceland tousled brook viral artisan.'}
            onBlur={(v) => handleUpdate('footerText', v)}
            isEditing={isEditing}
            className="text-xs text-[color:var(--color-muted,#6b7280)] mt-3"
            style={{ 
              fontFamily: block.style?.fontFamily,
              color: block.style?.color || 'var(--color-text, #111827)',
              ...content.footerStyle
            }}
          />
        </EditableElement>
      </div>
    </section>
  );
};
