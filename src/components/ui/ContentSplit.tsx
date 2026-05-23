import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentSplit = ({ block, isEditing = false }: any) => {
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

  const updateNested = (parentKey: string, childKey: string, value: string) => {
    if (!isEditing) return;
    const parentData = { ...(content[parentKey] || (parentKey === 'left' ? left : right)) };
    parentData[childKey] = value;
    handleUpdate(parentKey, parentData);
  };

  const left = content.left || {
    image: 'https://dummyimage.com/1201x501',
    title: 'Buy YouTube Videos',
    description: 'Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.',
    buttonText: 'Button'
  };

  const right = content.right || {
    image: 'https://dummyimage.com/1202x502',
    title: 'The Catalyzer',
    description: 'Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.',
    buttonText: 'Button'
  };

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -mx-4 -mb-10 text-center">
          <div className="sm:w-1/2 mb-10 px-4">
            <div className="rounded-lg h-64 overflow-hidden">
              <img alt="content" className="object-cover object-center h-full w-full" src={left.image} />
            </div>
            <InlineEditableText
              tagName="h2"
              value={left.title || 'Left Title'}
              onBlur={(v) => updateNested('left', 'title', v)}
              isEditing={isEditing}
              className="title-font text-2xl font-medium text-gray-900 mt-6 mb-3"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.leftTitleStyle 
              }}
            />
            <InlineEditableText
              tagName="p"
              value={left.description || 'Left Description'}
              onBlur={(v) => updateNested('left', 'description', v)}
              isEditing={isEditing}
              className="leading-relaxed text-base"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.leftDescriptionStyle 
              }}
            />
            <a 
              href={isEditing ? undefined : left.url || '#'}
              className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded text-center w-max" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.leftButtonStyle 
              }}
              onClick={(e) => isEditing && e.preventDefault()}
            >
              <InlineEditableText
                value={left.buttonText || 'Button'}
                onBlur={(v) => updateNested('left', 'buttonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
            </a>
          </div>
          <div className="sm:w-1/2 mb-10 px-4">
            <div className="rounded-lg h-64 overflow-hidden">
              <img alt="content" className="object-cover object-center h-full w-full" src={right.image} />
            </div>
            <InlineEditableText
              tagName="h2"
              value={right.title || 'Right Title'}
              onBlur={(v) => updateNested('right', 'title', v)}
              isEditing={isEditing}
              className="title-font text-2xl font-medium text-gray-900 mt-6 mb-3"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.rightTitleStyle 
              }}
            />
            <InlineEditableText
              tagName="p"
              value={right.description || 'Right Description'}
              onBlur={(v) => updateNested('right', 'description', v)}
              isEditing={isEditing}
              className="leading-relaxed text-base"
              style={{ 
                color: block.style?.color, 
                fontFamily: block.style?.fontFamily,
                ...content.rightDescriptionStyle 
              }}
            />
            <a 
              href={isEditing ? undefined : right.url || '#'}
              className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded text-center w-max" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.rightButtonStyle 
              }}
              onClick={(e) => isEditing && e.preventDefault()}
            >
              <InlineEditableText
                value={right.buttonText || 'Button'}
                onBlur={(v) => updateNested('right', 'buttonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
