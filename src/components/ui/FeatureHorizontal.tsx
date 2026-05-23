import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureHorizontal = ({ block, isEditing = false }: any) => {
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

  const handleUpdate = (key: string, newValue: any) => {
    if (!isEditing) return;
    const updatedContent = { ...content, [key]: newValue };
    dispatch(
      updateBlockContent({
        id: block.uniqueId,
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
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <div className="flex flex-wrap -m-4">
          {features.map((feature: any, index: number) => (
            <div key={index} className="p-4 lg:w-1/2 md:w-full">
              <div className="flex border-2 rounded-lg border-gray-200 border-opacity-50 p-8 sm:flex-row flex-col">
                <div className="w-16 h-16 sm:mr-8 sm:mb-0 mb-4 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 flex-shrink-0 overflow-hidden">
                  {feature.image ? (
                    <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                  ) : (
                    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-8 h-8" viewBox="0 0 24 24">
                      <path d={index === 0 ? "M22 12h-4l-3 9L9 3l-3 9H2" : "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"}></path>
                      {index === 1 && <circle cx="12" cy="7" r="4"></circle>}
                    </svg>
                  )}
                </div>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
