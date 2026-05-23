import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentIcons = ({ block, isEditing = false }: any) => {
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
    { title: 'Shooting Stars', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'activity' },
    { title: 'The Catalyzer', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'sparkles' },
    { title: 'Neptune', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'user' },
    { title: 'Melanchole', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'flag' },
    { title: 'Bunker', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'moon' },
    { title: 'Ramona Falls', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'shield' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap w-full mb-20 flex-col items-center text-center">
          <InlineEditableText
            tagName="h1"
            value={content.title || 'Pitchfork Kickstarter Taxidermy'}
            onBlur={(v) => handleUpdate('title', v)}
            isEditing={isEditing}
            className="sm:text-3xl text-2xl font-medium title-font mb-2 text-gray-900"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.titleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.description || 'Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table.'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
            className="lg:w-1/2 w-full leading-relaxed text-gray-500"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
            }}
          />
        </div>
        <div className="flex flex-wrap -m-4">
          {features.map((feature: any, index: number) => (
            <div key={index} className="xl:w-1/3 md:w-1/2 p-4">
              <a 
                href={isEditing ? undefined : (feature.url || content.linkUrl || '#')}
                className={`block border border-gray-200 p-6 rounded-lg transition-shadow duration-300 ${!isEditing ? 'hover:shadow-lg cursor-pointer' : ''}`}
                onClick={(e) => isEditing && e.preventDefault()}
              >
                <div className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 mb-4 overflow-hidden">
                   {feature.image ? (
                     <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                   ) : (
                     <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                    </svg>
                   )}
                </div>
                <InlineEditableText
                  tagName="h2"
                  value={feature.title || 'Feature Title'}
                  onBlur={(v) => updateFeature(index, 'title', v)}
                  isEditing={isEditing}
                  className="text-lg text-gray-900 font-medium title-font mb-2"
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
              </a>
            </div>
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
