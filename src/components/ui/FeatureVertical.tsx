import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureVertical = ({ block, isEditing = false }: BlockRendererProps) => {
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
    { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
    { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
    { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="text-center mb-20">
          <InlineEditableText
            tagName="h1"
            value={content.mainTitle || 'Raw Denim Heirloom Man Braid'}
            onBlur={(v) => handleUpdate('mainTitle', v)}
            isEditing={isEditing}
            className="sm:text-3xl text-2xl font-medium title-font text-gray-900 mb-4"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.mainTitleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.mainDescription || 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.'}
            onBlur={(v) => handleUpdate('mainDescription', v)}
            isEditing={isEditing}
            className="text-base leading-relaxed xl:w-2/4 lg:w-3/4 mx-auto text-gray-500"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.mainDescriptionStyle 
            }}
          />
          <div className="flex mt-6 justify-center">
            <div className="w-16 h-1 rounded-full bg-indigo-500 inline-flex"></div>
          </div>
        </div>
        <div className="flex flex-wrap sm:-m-4 -mx-4 -mb-10 -mt-4 md:space-y-0 space-y-6">
          {features.map((feature: BlockContentItem, index: number) => (
            <EditableElement
              key={index}
              block={block}
              isEditing={isEditing}
              path={`features.${index}.cardStyle`}
              className="p-4 md:w-1/3 flex flex-col text-center items-center"
            >
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`features.${index}.iconStyle`}
                className="w-20 h-20 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-5 flex-shrink-0 overflow-hidden"
              >
                {feature.image ? (
                  <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                ) : (
                  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-10 h-10" viewBox="0 0 24 24">
                    <path d={index === 0 ? "M22 12h-4l-3 9L9 3l-3 9H2" : index === 1 ? "M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" : "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"}></path>
                    {index === 1 && <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></>}
                    {index === 2 && <circle cx="12" cy="7" r="4"></circle>}
                  </svg>
                )}
              </EditableElement>
              <div className="flex-grow">
                <InlineEditableText
                  tagName="h2"
                  value={feature.title || 'Feature Title'}
                  onBlur={(v) => updateFeature(index, 'title', v)}
                  isEditing={isEditing}
                  className="text-gray-900 text-lg title-font font-medium mb-3"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.featureTitleStyle 
                  }}
                />
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
                  extraProps={{ href: isEditing ? undefined : (feature.url || content.linkUrl || '#') }}
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
          ))}
        </div>
        <a 
          href={isEditing ? undefined : content.buttonUrl || '#'}
          className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center w-max" 
          style={{ 
            fontFamily: block.style?.fontFamily,
            ...content.buttonStyle 
          }}
          onClick={(e) => isEditing && e.preventDefault()}
        >
          <InlineEditableText
            tagName="span"
            value={content.buttonText || 'Button'}
            onBlur={(v) => handleUpdate('buttonText', v)}
            isEditing={isEditing}
          />
        </a>
      </div>
    </section>
  );
};
