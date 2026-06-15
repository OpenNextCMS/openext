import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { EditableElement } from '@/components/editor/EditableElement';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const FeatureSideImage = ({ block, isEditing = false }: BlockRendererProps) => {
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
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto flex flex-wrap">
        <div className="lg:w-1/2 w-full mb-10 lg:mb-0 rounded-lg overflow-hidden">
          <img alt="feature" className="object-cover object-center h-full w-full" src={content.image || "https://dummyimage.com/460x500"} />
        </div>
        <div className="flex flex-col flex-wrap lg:py-6 -mb-10 lg:w-1/2 lg:pl-12 lg:text-left text-center">
          {features.map((feature: BlockContentItem, index: number) => (
            <EditableElement
              key={index}
              block={block}
              isEditing={isEditing}
              path={`features.${index}.cardStyle`}
              className="flex flex-col mb-10 lg:items-start items-center"
            >
              <EditableElement
                block={block}
                isEditing={isEditing}
                path={`features.${index}.iconStyle`}
                className="w-12 h-12 inline-flex items-center justify-center rounded-full bg-[var(--color-surface,#e0e7ff)] text-[color:var(--color-primary,#6366f1)] mb-5"
              >
                <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-6 h-6" viewBox="0 0 24 24">
                  <path d={index === 0 ? "M22 12h-4l-3 9L9 3l-3 9H2" : index === 1 ? "M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" : "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"}></path>
                  {index === 1 && <><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle></>}
                  {index === 2 && <circle cx="12" cy="7" r="4"></circle>}
                </svg>
              </EditableElement>
              <div className="flex-grow">
                <InlineEditableText
                  tagName="h2"
                  value={feature.title || 'Feature Title'}
                  onBlur={(v) => updateFeature(index, 'title', v)}
                  isEditing={isEditing}
                  className="text-[color:var(--color-text,#111827)] text-lg title-font font-medium mb-3"
                  style={{ 
                    color: block.style?.color || 'var(--color-text, #111827)', 
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
                    color: block.style?.color || 'var(--color-text, #111827)', 
                    fontFamily: block.style?.fontFamily,
                    ...content.featureDescriptionStyle 
                  }}
                />
                <EditableElement
                  as="a"
                  block={block}
                  isEditing={isEditing}
                  path={`features.${index}.buttonStyle`}
                  className="mt-3 text-[color:var(--color-primary,#6366f1)] inline-flex items-center cursor-pointer"
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
      </div>
    </section>
  );
};
