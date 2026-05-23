import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps, BlockData } from '@/types/index';

export const ContactSimple = ({ block, isEditing = false }: BlockRendererProps) => {
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
    dispatch(setSelectedLabel('Contact Simple'));
  };

  return (
    <section 
      className="text-gray-600 body-font relative w-full" 
      style={block.style}
      onClick={handleSelect}
    >
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col text-center w-full mb-12">
          <InlineEditableText
            tagName="h1"
            value={content.title || 'Contact Us'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
            className="sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.description || 'Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify.'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
            className="lg:w-2/3 mx-auto leading-relaxed text-base"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
            }}
          />
        </div>
        <div className="lg:w-1/2 md:w-2/3 mx-auto">
          <div className="flex flex-wrap -m-2">
            <div className="p-2 w-1/2">
              <div className="relative">
                <InlineEditableText
                  tagName="label"
                  value={content.nameLabel || 'Name'}
                  onBlur={(v) => handleUpdate('nameLabel', v)}
                  isEditing={isEditing}
                  className="leading-7 text-sm text-gray-600"
                  style={{ 
                    color: block.style?.color,
                    ...content.nameLabelStyle 
                  }}
                />
                <input type="text" id="name" name="name" className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out" />
              </div>
            </div>
            <div className="p-2 w-1/2">
              <div className="relative">
                <InlineEditableText
                  tagName="label"
                  value={content.emailLabel || 'Email'}
                  onBlur={(v) => handleUpdate('emailLabel', v)}
                  isEditing={isEditing}
                  className="leading-7 text-sm text-gray-600"
                  style={{ 
                    color: block.style?.color,
                    ...content.emailLabelStyle 
                  }}
                />
                <input type="email" id="email" name="email" className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 text-base outline-none text-gray-700 py-1 px-3 leading-8 transition-colors duration-200 ease-in-out" />
              </div>
            </div>
            <div className="p-2 w-full">
              <div className="relative">
                <InlineEditableText
                  tagName="label"
                  value={content.messageLabel || 'Message'}
                  onBlur={(v) => handleUpdate('messageLabel', v)}
                  isEditing={isEditing}
                  className="leading-7 text-sm text-gray-600"
                  style={{ 
                    color: block.style?.color,
                    ...content.messageLabelStyle 
                  }}
                />
                <textarea id="message" name="message" className="w-full bg-gray-100 bg-opacity-50 rounded border border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 h-32 text-base outline-none text-gray-700 py-1 px-3 resize-none leading-6 transition-colors duration-200 ease-in-out"></textarea>
              </div>
            </div>
            <div className="p-2 w-full">
              <InlineEditableText
                tagName="button"
                value={content.buttonText || 'Button'}
                onBlur={(v) => handleUpdate('buttonText', v)}
                isEditing={isEditing}
                className="flex mx-auto text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center"
                style={{ 
                  fontFamily: block.style?.fontFamily,
                  ...content.buttonStyle 
                }}
              />
            </div>
            <div className="p-2 w-full pt-8 mt-8 border-t border-gray-200 text-center">
              <InlineEditableText
                tagName="a"
                value={content.email || 'example@email.com'}
                onBlur={(v) => handleUpdate('email', v)}
                isEditing={isEditing}
                className="text-indigo-500"
                style={{ 
                  color: block.style?.color, 
                  fontFamily: block.style?.fontFamily,
                  ...content.emailStyle 
                }}
              />
              <div className="leading-normal my-5" style={{ color: block.style?.color, fontFamily: block.style?.fontFamily }}>
                <InlineEditableText
                  tagName="span"
                  value={content.address || '49 Smith St.'}
                  onBlur={(v) => handleUpdate('address', v)}
                  isEditing={isEditing}
                  style={content.addressStyle}
                />
                <br />
                <InlineEditableText
                  tagName="span"
                  value={content.city || 'Saint Cloud, MN 56301'}
                  onBlur={(v) => handleUpdate('city', v)}
                  isEditing={isEditing}
                  style={content.cityStyle}
                />
              </div>
              <span className="inline-flex">
                {/* Social icons remain gray-500 by default unless explicitly themed */}
                <a className="text-gray-500">
                  <svg fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path>
                  </svg>
                </a>
                <a className="ml-4 text-gray-500">
                  <svg fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                  </svg>
                </a>
                <a className="ml-4 text-gray-500">
                  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"></path>
                  </svg>
                </a>
                <a className="ml-4 text-gray-500">
                  <svg fill="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
                  </svg>
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
