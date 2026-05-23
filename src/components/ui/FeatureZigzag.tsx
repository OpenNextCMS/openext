import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureZigzag = ({ block, isEditing = false }: BlockRendererProps) => {
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
    { title: 'The 400 Blows', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        {features.map((feature: BlockContentItem, index: number) => {
          const isEven = index % 2 === 1;
          const icon = (
            <div className={`sm:w-32 sm:h-32 h-20 w-20 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 flex-shrink-0 overflow-hidden ${isEven ? 'sm:ml-10 sm:order-none order-first' : 'sm:mr-10'}`}>
              {feature.image ? (
                <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
              ) : (
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="sm:w-16 sm:h-16 w-10 h-10" viewBox="0 0 24 24">
                  <path d={index === 0 ? "M22 12h-4l-3 9L9 3l-3 9H2" : index === 1 ? "M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" : "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"}></path>
                  {index === 1 && <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></>}
                  {index === 2 && <circle cx="12" cy="7" r="4"></circle>}
                </svg>
              )}
            </div>
          );

          const textContent = (
            <div className={`flex-grow sm:text-left text-center mt-6 sm:mt-0`}>
              <InlineEditableText
                tagName="h2"
                value={feature.title || 'Feature Title'}
                onBlur={(v) => updateFeature(index, 'title', v)}
                isEditing={isEditing}
                className="text-gray-900 text-lg title-font font-medium mb-2"
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
              <a 
                href={isEditing ? undefined : (feature.url || content.linkUrl || '#')}
                className="mt-3 text-indigo-500 inline-flex items-center cursor-pointer" 
                style={{ fontFamily: block.style?.fontFamily }}
                onClick={(e) => isEditing && e.preventDefault()}
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
              </a>
            </div>
          );

          return (
            <div key={index} className={`flex items-center lg:w-3/5 mx-auto sm:flex-row flex-col ${index !== features.length - 1 ? 'border-b pb-10 mb-10 border-gray-200' : ''}`}>
              {!isEven ? (
                <>
                  {icon}
                  {textContent}
                </>
              ) : (
                <>
                  {textContent}
                  {icon}
                </>
              )}
            </div>
          );
        })}
        <InlineEditableText
          tagName="button"
          value={content.buttonText || 'Button'}
          onBlur={(v) => handleUpdate('buttonText', v)}
          isEditing={isEditing}
          className="flex mx-auto mt-20 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center"
          style={{ 
            fontFamily: block.style?.fontFamily,
            ...content.buttonStyle 
          }}
        />
      </div>
    </section>
  );
};
