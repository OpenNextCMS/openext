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

export const FeatureList = ({ block, isEditing = false }: BlockRendererProps) => {
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

<<<<<<< HEAD
  const rawCategories = React.useMemo(
    () =>
      content.categories || [
        { title: 'SHOOTING STARS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'THE 400 BLOWS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'THE CATALYZER', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'NEPTUNE', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
      ],
    [content.categories]
  );
=======
  const rawCategories = content.categories || [
    { title: 'SHOOTING STARS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
    { title: 'THE 400 BLOWS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
    { title: 'THE CATALYZER', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
    { title: 'NEPTUNE', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
  ];
>>>>>>> khadija

  // Convert nested links to objects for consistent handling
  const categories = React.useMemo(() => {
    return rawCategories.map((cat: BlockContentItem) => ({
      ...cat,
      links: (cat.links || []).map((link: unknown) => 
        typeof link === 'string' ? { text: link, url: '#' } : link
      )
    }));
  }, [rawCategories]);

  const updateCategory = (idx: number, title: string) => {
    if (!isEditing) return;
    const currentCategories = [...rawCategories];
    currentCategories[idx] = { ...currentCategories[idx], title };
    handleUpdate('categories', currentCategories);
  };

  const updateLink = (idx: number, lIdx: number, field: 'text' | 'url', value: string) => {
    if (!isEditing) return;
    const currentCategories = JSON.parse(JSON.stringify(categories));
    currentCategories[idx].links[lIdx][field] = value;
    handleUpdate('categories', currentCategories);
  };

  return (
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
>>>>>>> khadija
      <div className="container px-5 py-24 mx-auto">
        <div className="text-center mb-20">
          <InlineEditableText
            tagName="h1"
            value={content.mainTitle || 'Raw Denim Heirloom Man Braid'}
            onBlur={(v) => handleUpdate('mainTitle', v)}
            isEditing={isEditing}
<<<<<<< HEAD
            className="sm:text-3xl text-2xl font-medium text-center title-font text-[color:var(--color-text,#111827)] mb-4"
            style={{ 
              color: block.style?.color || 'var(--color-text, #111827)', 
=======
            className="sm:text-3xl text-2xl font-medium text-center title-font text-gray-900 mb-4"
            style={{ 
              color: block.style?.color, 
>>>>>>> khadija
              fontFamily: block.style?.fontFamily,
              ...content.mainTitleStyle 
            }}
          />
          <InlineEditableText
            tagName="p"
            value={content.mainDescription || 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.'}
            onBlur={(v) => handleUpdate('mainDescription', v)}
            isEditing={isEditing}
            className="text-base leading-relaxed xl:w-2/4 lg:w-3/4 mx-auto"
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
        <div className="flex flex-wrap -m-4">
          {categories.map((cat: BlockContentItem, idx: number) => (
<<<<<<< HEAD
            <EditableElement
              key={idx}
              block={block}
              isEditing={isEditing}
              path={`categories.${idx}.cardStyle`}
              className="p-4 lg:w-1/4 sm:w-1/2 w-full"
            >
=======
            <div key={idx} className="p-4 lg:w-1/4 sm:w-1/2 w-full">
>>>>>>> khadija
              <InlineEditableText
                tagName="h2"
                value={cat.title || 'CATEGORY'}
                onBlur={(v) => updateCategory(idx, v)}
                isEditing={isEditing}
<<<<<<< HEAD
                className="font-medium title-font tracking-widest text-[color:var(--color-text,#111827)] mb-4 text-sm text-center sm:text-left uppercase"
                style={{ 
                  color: block.style?.color || 'var(--color-text, #111827)', 
=======
                className="font-medium title-font tracking-widest text-gray-900 mb-4 text-sm text-center sm:text-left uppercase"
                style={{ 
                  color: block.style?.color, 
>>>>>>> khadija
                  fontFamily: block.style?.fontFamily,
                  ...content.categoryTitleStyle 
                }}
              />
              <nav className="flex flex-col sm:items-start sm:text-left text-center items-center -mb-1 space-y-2.5">
                {(cat.links || []).map((link: BlockContentItem, lIdx: number) => (
                  <a 
                    key={lIdx} 
                    href={isEditing ? undefined : (link.url || content.linkUrl || '#')}
<<<<<<< HEAD
                    className="cursor-pointer hover:text-[color:var(--color-text,#1f2937)] flex items-center"
                    onClick={(e) => isEditing && e.preventDefault()}
                  >
                    <span className="bg-[var(--color-surface,#e0e7ff)] text-[color:var(--color-primary,#6366f1)] w-4 h-4 mr-2 rounded-full inline-flex items-center justify-center flex-shrink-0">
=======
                    className="cursor-pointer hover:text-gray-800 flex items-center"
                    onClick={(e) => isEditing && e.preventDefault()}
                  >
                    <span className="bg-indigo-100 text-indigo-500 w-4 h-4 mr-2 rounded-full inline-flex items-center justify-center flex-shrink-0">
>>>>>>> khadija
                      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" className="w-3 h-3" viewBox="0 0 24 24">
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                    </span>
                    <InlineEditableText
                      tagName="span"
                      value={link.text || 'Link Text'}
                      onBlur={(v) => updateLink(idx, lIdx, 'text', v)}
                      isEditing={isEditing}
                      style={{ 
<<<<<<< HEAD
                        color: block.style?.color || 'var(--color-text, #111827)', 
=======
                        color: block.style?.color, 
>>>>>>> khadija
                        fontFamily: block.style?.fontFamily,
                        ...content.linkTextStyle 
                      }}
                    />
                  </a>
                ))}
              </nav>
<<<<<<< HEAD
            </EditableElement>
=======
            </div>
>>>>>>> khadija
          ))}
        </div>
        <a 
          href={isEditing ? undefined : content.buttonUrl || '#'}
<<<<<<< HEAD
          className="flex mx-auto mt-16 text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-8 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-lg text-center w-max" 
=======
          className="flex mx-auto mt-16 text-white bg-indigo-500 border-0 py-2 px-8 focus:outline-none hover:bg-indigo-600 rounded text-lg text-center w-max" 
>>>>>>> khadija
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
