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

export const ContentFeatures = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const updateFeature = (index: number, key: string, value: string) => {
    if (!isEditing) return;
    const currentFeatures = [...features];
    currentFeatures[index] = { ...currentFeatures[index], [key]: value };
    handleUpdate('features', currentFeatures);
  };

  const features = content.features || [
    { title: 'Shooting Stars', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { title: 'The Catalyzer', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { title: 'Neptune', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
    { title: 'Melanchole', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
  ];

  return (
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
>>>>>>> khadija
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col text-center w-full mb-20">
          <InlineEditableText
            tagName="h2"
            value={content.eyebrow || 'ROOF PARTY POLAROID'}
            onBlur={(v) => handleUpdate('eyebrow', v)}
            isEditing={isEditing}
<<<<<<< HEAD
            className="text-xs text-[color:var(--color-primary,#6366f1)] tracking-widest font-medium title-font mb-1"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
            className="text-xs text-indigo-500 tracking-widest font-medium title-font mb-1"
            style={{ 
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.eyebrowStyle 
            }}
          />
          <InlineEditableText
            tagName="h1"
            value={content.title || 'Master Cleanse Reliac Heirloom'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
<<<<<<< HEAD
            className="sm:text-3xl text-2xl font-medium title-font mb-4 text-[color:var(--color-text,#111827)]"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
            className="sm:text-3xl text-2xl font-medium title-font mb-4 text-gray-900"
            style={{ 
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.description || "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag."}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
            className="lg:w-2/3 mx-auto leading-relaxed text-base"
            style={{ 
<<<<<<< HEAD
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
            }}
          />
        </div>
        <div className="flex flex-wrap">
          {features.map((feature: BlockContentItem, index: number) => (
<<<<<<< HEAD
            <EditableElement
              key={index}
              block={block}
              isEditing={isEditing}
              path={`features.${index}.cardStyle`}
              className="xl:w-1/4 lg:w-1/2 md:w-full px-8 py-6 border-l-2 border-gray-200 border-opacity-60"
            >
=======
            <div key={index} className="xl:w-1/4 lg:w-1/2 md:w-full px-8 py-6 border-l-2 border-gray-200 border-opacity-60">
>>>>>>> khadija
              <InlineEditableText
                tagName="h2"
                value={feature.title || 'Feature Title'}
                onBlur={(v) => updateFeature(index, 'title', v)}
                isEditing={isEditing}
<<<<<<< HEAD
                className="text-lg sm:text-xl text-[color:var(--color-text,#111827)] font-medium title-font mb-2"
                style={{ 
                  color: block.style?.color || 'var(--color-text, #111827)', 
=======
                className="text-lg sm:text-xl text-gray-900 font-medium title-font mb-2"
                style={{ 
                  color: block.style?.color, 
>>>>>>> khadija
                  fontFamily: block.style?.fontFamily,
                  ...content.featureTitleStyle 
                }}
              />
              <InlineEditableText
                tagName="p"
                value={feature.description || 'Feature Description'}
                onBlur={(v) => updateFeature(index, 'description', v)}
                isEditing={isEditing}
                className="leading-relaxed text-base mb-4"
                style={{ 
<<<<<<< HEAD
                  color: block.style?.color || 'var(--color-text, #111827)', 
=======
                  color: block.style?.color, 
>>>>>>> khadija
                  fontFamily: block.style?.fontFamily,
                  ...content.featureDescriptionStyle 
                }}
              />
<<<<<<< HEAD
              <EditableElement
                as="a"
                block={block}
                isEditing={isEditing}
                path={`features.${index}.buttonStyle`}
                className="text-[color:var(--color-primary,#6366f1)] inline-flex items-center cursor-pointer"
                baseStyle={{ fontFamily: block.style?.fontFamily }}
                extraProps={{ href: isEditing ? undefined : (feature.url || content.linkUrl || '#') }}
=======
              <a 
                href={isEditing ? undefined : (feature.url || content.linkUrl || '#')}
                className="text-indigo-500 inline-flex items-center cursor-pointer" 
                style={{ fontFamily: block.style?.fontFamily }}
                onClick={(e) => isEditing && e.preventDefault()}
>>>>>>> khadija
              >
                <InlineEditableText
                  tagName="span"
                  value={feature.linkText || content.linkText || 'Learn More'}
                  onBlur={(v) => updateFeature(index, 'linkText', v)}
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
        <InlineEditableText
          tagName="button"
          value={content.buttonText || 'Button'}
          onBlur={(v) => handleUpdate('buttonText', v)}
          isEditing={isEditing}
<<<<<<< HEAD
          className="flex mx-auto mt-16 text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-8 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-lg text-center"
=======
          className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center"
>>>>>>> khadija
          style={{ 
            fontFamily: block.style?.fontFamily,
            ...content.buttonStyle 
          }}
        />
      </div>
    </section>
  );
};
