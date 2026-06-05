import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentGallery = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const updateItem = (index: number, key: string, value: string) => {
    if (!isEditing) return;
    const currentItems = [...items];
    currentItems[index] = { ...currentItems[index], [key]: value };
    handleUpdate('items', currentItems);
  };

  const items = content.items || [
    { image: 'https://dummyimage.com/720x400', subtitle: 'SUBTITLE', title: 'Chichen Itza', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { image: 'https://dummyimage.com/721x401', subtitle: 'SUBTITLE', title: 'Colosseum Roma', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { image: 'https://dummyimage.com/722x402', subtitle: 'SUBTITLE', title: 'Great Pyramid of Giza', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { image: 'https://dummyimage.com/723x403', subtitle: 'SUBTITLE', title: 'San Francisco', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap w-full mb-20">
          <div className="lg:w-1/2 w-full mb-6 lg:mb-0">
            <InlineEditableText
              tagName="h1"
              value={content.mainTitle || 'Pitchfork Kickstarter Taxidermy'}
              onBlur={(v) => handleUpdate('mainTitle', v)}
              isEditing={isEditing}
              className="sm:text-3xl text-2xl font-medium title-font mb-2 text-gray-900"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.mainTitleStyle 
              }}
            />
            <div className="h-1 w-20 bg-indigo-500 rounded"></div>
          </div>
          <InlineEditableText
            tagName="p"
            value={content.mainDescription || "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag."}
            onBlur={(v) => handleUpdate('mainDescription', v)}
            isEditing={isEditing}
            className="lg:w-1/2 w-full leading-relaxed text-gray-500"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.mainDescriptionStyle 
            }}
          />
        </div>
        <div className="flex flex-wrap -m-4">
          {items.map((item: BlockContentItem, index: number) => (
            <div key={index} className="xl:w-1/4 md:w-1/2 p-4">
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`items.${index}.cardStyle`}
                className="bg-gray-100 p-6 rounded-lg"
              >
                <EditableElement
                  as="img"
                  block={block}
                  isEditing={isEditing}
                  path={`items.${index}.imageStyle`}
                  className="h-40 rounded w-full object-cover object-center mb-6"
                  extraProps={{ src: item.image, alt: "content" }}
                />
                <InlineEditableText
                  tagName="h3"
                  value={item.subtitle || 'SUBTITLE'}
                  onBlur={(v) => updateItem(index, 'subtitle', v)}
                  isEditing={isEditing}
                  className="tracking-widest text-indigo-500 text-xs font-medium title-font mb-1"
                  style={{ 
                    fontFamily: block.style?.fontFamily,
                    ...content.itemSubtitleStyle 
                  }}
                />
                <InlineEditableText
                  tagName="h2"
                  value={item.title || 'Item Title'}
                  onBlur={(v) => updateItem(index, 'title', v)}
                  isEditing={isEditing}
                  className="text-lg text-gray-900 font-medium title-font mb-4"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.itemTitleStyle 
                  }}
                />
                <InlineEditableText
                  tagName="p"
                  value={item.description || 'Item Description'}
                  onBlur={(v) => updateItem(index, 'description', v)}
                  isEditing={isEditing}
                  className="leading-relaxed text-base"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.itemDescriptionStyle 
                  }}
                />
              </EditableElement>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
