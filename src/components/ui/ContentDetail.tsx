import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentDetail = ({ block, isEditing = false }: BlockRendererProps) => {
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
      <div className="container px-5 py-24 mx-auto flex flex-col">
        <div className="lg:w-4/6 mx-auto">
          <EditableElement
            block={block}
            isEditing={isEditing}
            path="imageStyle"
            className="rounded-lg h-64 overflow-hidden"
          >
            <img alt="content" className="object-cover object-center h-full w-full" src={content.heroImage || "https://dummyimage.com/1200x500"} />
          </EditableElement>
          <div className="flex flex-col sm:flex-row mt-10">
            <div className="sm:w-1/3 text-center sm:pr-8 sm:py-8">
              <EditableElement
                block={block}
                isEditing={isEditing}
                path="iconStyle"
                className="w-20 h-20 rounded-full inline-flex items-center justify-center bg-[var(--color-surface,#e5e7eb)] text-[color:var(--color-muted,#9ca3af)]"
              >
                {content.authorImage ? (
                  <img src={content.authorImage} alt="author" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-10 h-10" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                )}
              </EditableElement>
              <div className="flex flex-col items-center text-center justify-center">
                <InlineEditableText
                  tagName="h2"
                  value={content.authorName || 'Phoebe Caulfield'}
                  onBlur={(v) => handleUpdate('authorName', v)}
                  isEditing={isEditing}
                  className="font-medium title-font mt-4 text-[color:var(--color-text,#111827)] text-lg"
                  style={{ 
                    color: block.style?.color || 'var(--color-text, #111827)', 
                    fontFamily: block.style?.fontFamily,
                    ...content.authorNameStyle 
                  }}
                />
                <div className="w-12 h-1 bg-[var(--color-primary,#6366f1)] rounded mt-2 mb-4"></div>
                <InlineEditableText
                  tagName="p"
                  value={content.authorBio || 'Raclette knausgaard hella meggs normcore williamsburg enamel pin sartorial venmo tbh hot chicken gentrify portland.'}
                  onBlur={(v) => handleUpdate('authorBio', v)}
                  isEditing={isEditing}
                  className="text-base"
                  style={{ 
                    color: block.style?.color || 'var(--color-text, #111827)', 
                    fontFamily: block.style?.fontFamily,
                    ...content.authorBioStyle 
                  }}
                />
              </div>
            </div>
            <div className="sm:w-2/3 sm:pl-8 sm:py-8 sm:border-l border-gray-200 sm:border-t-0 border-t mt-4 pt-4 sm:mt-0 text-center sm:text-left">
              <InlineEditableText
                tagName="p"
                value={content.mainText || "Meggings portland fingerstache lyft, post-ironic fixie man bun banh mi umami everyday carry hexagon locavore direct trade art party. Locavore small batch listicle gastropub farm-to-table lumbersexual salvia messenger bag. Coloring book flannel truffaut craft beer drinking vinegar sartorial, disrupt fashion axe normcore meh butcher. Portland 90's scenester vexillologist forage post-ironic asymmetrical, chartreuse disrupt butcher paleo intelligentsia pabst before they sold out four loko. 3 wolf moon brooklyn."}
                onBlur={(v) => handleUpdate('mainText', v)}
                isEditing={isEditing}
                className="leading-relaxed text-lg mb-4"
                style={{ 
                  color: block.style?.color || 'var(--color-text, #111827)', 
                  fontFamily: block.style?.fontFamily,
                  ...content.mainTextStyle 
                }}
              />
              <EditableElement
                as="a"
                block={block}
                isEditing={isEditing}
                path="buttonStyle"
                className="text-[color:var(--color-primary,#6366f1)] inline-flex items-center cursor-pointer"
                baseStyle={{ fontFamily: block.style?.fontFamily }}
                extraProps={{ href: isEditing ? undefined : content.linkUrl || '#' }}
              >
                <InlineEditableText
                  tagName="span"
                  value={content.linkText || 'Learn More'}
                  onBlur={(v) => handleUpdate('linkText', v)}
                  isEditing={isEditing}
                />
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
              </EditableElement>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
