import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureBoxed = ({ block, isEditing = false }: BlockRendererProps) => {
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
    { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
    { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
    { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col text-center w-full mb-20">
          <InlineEditableText
            tagName="h2"
            value={content.eyebrow || 'ROOF PARTY POLAROID'}
            onBlur={(v) => handleUpdate('eyebrow', v)}
            isEditing={isEditing}
            className="text-xs text-indigo-500 tracking-widest font-medium title-font mb-1 uppercase"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.eyebrowStyle 
            }}
          />
          <InlineEditableText
            tagName="h1"
            value={content.mainTitle || 'Master Cleanse Reliac Heirloom'}
            onBlur={(v) => handleUpdate('mainTitle', v)}
            isEditing={isEditing}
            className="sm:text-3xl text-2xl font-medium title-font text-gray-900"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.mainTitleStyle 
            }}
          />
        </div>
        <div className="flex flex-wrap -m-4">
          {features.map((feature: BlockContentItem, index: number) => (
            <div key={index} className="p-4 md:w-1/3">
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`features.${index}.cardStyle`}
                className="flex rounded-lg h-full bg-gray-100 p-8 flex-col"
              >
                <div className="flex items-center mb-3">
                  <EditableElement
                    block={block}
                    isEditing={isEditing}
                    path={`features.${index}.iconStyle`}
                    className="w-8 h-8 mr-3 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white flex-shrink-0 overflow-hidden"
                  >
                    {feature.image ? (
                      <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                    ) : (
                      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-5 h-5" viewBox="0 0 24 24">
                         <path d={index === 0 ? "M22 12h-4l-3 9L9 3l-3 9H2" : index === 1 ? "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" : "M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"}></path>
                         {index === 1 && <circle cx="12" cy="7" r="4"></circle>}
                         {index === 2 && <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></>}
                      </svg>
                    )}
                  </EditableElement>
                  <InlineEditableText
                    tagName="h2"
                    value={feature.title || 'Feature Title'}
                    onBlur={(v) => updateFeature(index, 'title', v)}
                    isEditing={isEditing}
                    className="text-gray-900 text-lg title-font font-medium"
                    style={{ 
                      color: block.style?.color, 
                      fontFamily: block.style?.fontFamily,
                      ...content.featureTitleStyle 
                    }}
                  />
                </div>
                <div className="flex-grow">
                  <InlineEditableText
                    tagName="p"
                    value={feature.description || 'Feature Description'}
                    onBlur={(v) => updateFeature(index, 'description', v)}
                    isEditing={isEditing}
                    className="leading-relaxed text-base"
                    style={{ 
                      color: block.style?.color, 
                      fontFamily: block.style?.fontFamily,
                      ...content.featureDescriptionStyle 
                    }}
                  />
                  <EditableElement
                    as="a"
                    block={block}
                    isEditing={isEditing}
                    path={`features.${index}.buttonStyle`}
                    className="mt-3 text-indigo-500 inline-flex items-center cursor-pointer"
                    baseStyle={{ fontFamily: block.style?.fontFamily }}
                    extraProps={{ href: isEditing ? undefined : feature.url || content.linkUrl || '#' }}
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
                  </EditableElement>
                </div>
              </EditableElement>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
