import React from 'react';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps, BlockData } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';

export const ContentCategories = ({ block, isEditing = false }: BlockRendererProps) => {
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

  const handleSelect = (e: React.MouseEvent) => {
    if (!isEditing) return;
    e.stopPropagation();
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Content Categories'));
  };

  const rawLinks = content.links || [
    'First Link', 'Second Link', 'Third Link', 'Fourth Link',
    'Fifth Link', 'Sixth Link', 'Seventh Link', 'Eighth Link'
  ];

  // Convert string links to objects for consistent handling
  const links = React.useMemo(() => {
    return rawLinks.map((link: unknown) => 
      typeof link === 'string' ? { text: link, url: '#' } : link
    );
  }, [rawLinks]);

  const updateLink = (index: number, field: 'text' | 'url', newValue: string) => {
    if (!isEditing) return;
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: newValue };
    handleUpdate('links', newLinks);
  };

  return (
    <section 
      className="text-gray-600 body-font w-full" 
      style={block.style}
      onClick={handleSelect}
    >
      <div className="container flex flex-wrap px-5 py-24 mx-auto items-center">
        <div className="md:w-1/2 md:pr-12 md:py-8 md:border-r md:border-b-0 mb-10 md:mb-0 pb-10 border-b border-gray-200">
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
            value={content.description || 'Locavore cardigan small batch roof party blue bottle blog meggings sartorial jean shorts kickstarter migas sriracha church-key synth succulents. Actually taiyaki neutra, distillery gastropub pok pok ugh.'}
            onBlur={(v) => handleUpdate('description', v)}
            isEditing={isEditing}
            className="leading-relaxed text-base"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.descriptionStyle 
            }}
          />
          <a 
            href={isEditing ? undefined : content.linkUrl || '#'}
            className="text-indigo-500 inline-flex items-center mt-4 cursor-pointer" 
            style={{ 
              fontFamily: block.style?.fontFamily,
              ...content.linkTextStyle
            }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            <InlineEditableText
              tagName="span"
              value={content.linkText || 'Learn More'}
              onBlur={(v) => handleUpdate('linkText', v)}
              isEditing={isEditing}
            />
            <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="w-4 h-4 ml-2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
        <div className="flex flex-col md:w-1/2 md:pl-12">
          <InlineEditableText
            tagName="h2"
            value={content.categoryHeading || 'CATEGORIES'}
            onBlur={(v) => handleUpdate('categoryHeading', v)}
            isEditing={isEditing}
            className="title-font font-semibold text-gray-800 tracking-wider text-sm mb-3"
            style={{ 
              color: block.style?.color, 
              fontFamily: block.style?.fontFamily,
              ...content.categoryHeadingStyle 
            }}
          />
          <nav className="flex flex-wrap list-none -mb-1">
            {links.map((link: BlockContentItem, index: number) => (
              <li key={index} className="lg:w-1/3 mb-1 w-1/2">
                <a
                  href={isEditing ? undefined : (link.url as string | undefined)}
                  className="text-gray-600 hover:text-gray-800 cursor-pointer"
                  style={{
                    color: block.style?.color,
                    fontFamily: block.style?.fontFamily,
                    ...(content.linkItemStyle as React.CSSProperties)
                  }}
                  onClick={(e) => isEditing && e.preventDefault()}
                >
                  <InlineEditableText
                    tagName="span"
                    value={typeof link.text === 'string' ? link.text : ''}
                    onBlur={(v) => updateLink(index, 'text', v)}
                    isEditing={isEditing}
                  />
                </a>
              </li>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
};
