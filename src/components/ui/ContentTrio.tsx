import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
<<<<<<< HEAD
import { EditableElement } from '@/components/editor/EditableElement';
=======
>>>>>>> khadija
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentTrio = ({ block, isEditing = false }: BlockRendererProps) => {
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
    { image: 'https://dummyimage.com/1203x503', title: 'Shooting Stars', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
    { image: 'https://dummyimage.com/1204x504', title: 'The Catalyzer', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
    { image: 'https://dummyimage.com/1205x505', title: 'The 400 Blows', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
  ];

  return (
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col">
          <div className="h-1 bg-[var(--color-surface,#e5e7eb)] rounded overflow-hidden">
            <div className="w-24 h-full bg-[var(--color-primary,#6366f1)]"></div>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col">
          <div className="h-1 bg-gray-200 rounded overflow-hidden">
            <div className="w-24 h-full bg-indigo-500"></div>
>>>>>>> khadija
          </div>
          <div className="flex flex-wrap sm:flex-row flex-col py-6 mb-12">
            <InlineEditableText
              tagName="h1"
              value={content.mainTitle || 'Space The Final Frontier'}
              onBlur={(v) => handleUpdate('mainTitle', v)}
              isEditing={isEditing}
<<<<<<< HEAD
              className="sm:w-2/5 text-[color:var(--color-text,#111827)] font-medium title-font text-2xl mb-2 sm:mb-0"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
              className="sm:w-2/5 text-gray-900 font-medium title-font text-2xl mb-2 sm:mb-0"
              style={{ 
                color: block.style?.color, 
>>>>>>> khadija
                fontFamily: block.style?.fontFamily,
                ...content.mainTitleStyle 
              }}
            />
            <InlineEditableText
              tagName="p"
              value={content.mainDescription || 'Street art subway tile salvia four dollar toast bitters selfies quinoa yuccie synth meditation iPhone intelligentsia prism tofu. Viral gochujang bitters dreamcatcher.'}
              onBlur={(v) => handleUpdate('mainDescription', v)}
              isEditing={isEditing}
              className="sm:w-3/5 leading-relaxed text-base sm:pl-10 pl-0"
              style={{ 
<<<<<<< HEAD
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
                color: block.style?.color, 
>>>>>>> khadija
                fontFamily: block.style?.fontFamily,
                ...content.mainDescriptionStyle 
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4">
          {items.map((item: BlockContentItem, index: number) => (
<<<<<<< HEAD
            <EditableElement
              key={index}
              block={block}
              isEditing={isEditing}
              path={`items.${index}.cardStyle`}
              className="p-4 md:w-1/3 sm:mb-0 mb-6"
            >
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`items.${index}.imageStyle`}
                className="rounded-lg h-64 overflow-hidden"
              >
                <img alt="content" className="object-cover object-center h-full w-full" src={item.image} />
              </EditableElement>
=======
            <div key={index} className="p-4 md:w-1/3 sm:mb-0 mb-6">
              <div className="rounded-lg h-64 overflow-hidden">
                <img alt="content" className="object-cover object-center h-full w-full" src={item.image} />
              </div>
>>>>>>> khadija
              <InlineEditableText
                tagName="h2"
                value={item.title || 'Item Title'}
                onBlur={(v) => updateItem(index, 'title', v)}
                isEditing={isEditing}
<<<<<<< HEAD
                className="text-xl font-medium title-font text-[color:var(--color-text,#111827)] mt-5"
                style={{ 
                  color: block.style?.color || 'var(--color-text, #111827)', 
=======
                className="text-xl font-medium title-font text-gray-900 mt-5"
                style={{ 
                  color: block.style?.color, 
>>>>>>> khadija
                  fontFamily: block.style?.fontFamily,
                  ...content.itemTitleStyle 
                }}
              />
              <InlineEditableText
                tagName="p"
                value={item.description || 'Item Description'}
                onBlur={(v) => updateItem(index, 'description', v)}
                isEditing={isEditing}
                className="text-base leading-relaxed mt-2"
                style={{ 
<<<<<<< HEAD
                  color: block.style?.color || 'var(--color-text, #111827)', 
=======
                  color: block.style?.color, 
>>>>>>> khadija
                  fontFamily: block.style?.fontFamily,
                  ...content.itemDescriptionStyle 
                }}
              />
<<<<<<< HEAD
              <EditableElement
                as="a"
                block={block}
                isEditing={isEditing}
                path={`items.${index}.buttonStyle`}
                className="text-[color:var(--color-primary,#6366f1)] inline-flex items-center mt-3 cursor-pointer"
                baseStyle={{ fontFamily: block.style?.fontFamily }}
                extraProps={{ href: isEditing ? undefined : (item.url || content.linkUrl || '#') }}
=======
              <a 
                href={isEditing ? undefined : (item.url || content.linkUrl || '#')}
                className="text-indigo-500 inline-flex items-center mt-3 cursor-pointer" 
                style={{ fontFamily: block.style?.fontFamily }}
                onClick={(e) => isEditing && e.preventDefault()}
>>>>>>> khadija
              >
                <InlineEditableText
                  tagName="span"
                  value={item.linkText || content.linkText || 'Learn More'}
                  onBlur={(v) => updateItem(index, 'linkText', v)}
                  isEditing={isEditing}
                />
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
<<<<<<< HEAD
              </EditableElement>
            </EditableElement>
=======
              </a>
            </div>
>>>>>>> khadija
          ))}
        </div>
      </div>
    </section>
  );
};
