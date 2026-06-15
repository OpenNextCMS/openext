import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
<<<<<<< HEAD
import { EditableElement } from '@/components/editor/EditableElement';
=======
>>>>>>> khadija
import type { BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const ContentSplit = ({ block, isEditing = false }: BlockRendererProps) => {
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
<<<<<<< HEAD
    <section className="text-[color:var(--color-muted,#4b5563)] body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -mx-4 -mb-10 text-center">
          <EditableElement
            block={block}
            isEditing={isEditing}
            path="leftCardStyle"
            className="sm:w-1/2 mb-10 px-4"
          >
            <EditableElement
              block={block}
              isEditing={isEditing}
              path="leftImageStyle"
              className="rounded-lg h-64 overflow-hidden"
            >
              <img alt="content" className="object-cover object-center h-full w-full" src={left.image} />
            </EditableElement>
=======
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -mx-4 -mb-10 text-center">
          <div className="sm:w-1/2 mb-10 px-4">
            <div className="rounded-lg h-64 overflow-hidden">
              <img alt="content" className="object-cover object-center h-full w-full" src={left.image} />
            </div>
>>>>>>> khadija
            <InlineEditableText
              tagName="h2"
              value={left.title || 'Left Title'}
              onBlur={(v) => updateNested('left', 'title', v)}
              isEditing={isEditing}
<<<<<<< HEAD
              className="title-font text-2xl font-medium text-[color:var(--color-text,#111827)] mt-6 mb-3"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
              className="title-font text-2xl font-medium text-gray-900 mt-6 mb-3"
              style={{ 
                color: block.style?.color, 
>>>>>>> khadija
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
<<<<<<< HEAD
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
                color: block.style?.color, 
>>>>>>> khadija
                fontFamily: block.style?.fontFamily,
                ...content.leftDescriptionStyle 
              }}
            />
<<<<<<< HEAD
            <EditableElement
              as="a"
              block={block}
              isEditing={isEditing}
              path="leftButtonStyle"
              className="flex mx-auto mt-6 text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-5 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-center w-max"
              baseStyle={{ fontFamily: block.style?.fontFamily }}
              extraProps={{ href: isEditing ? undefined : left.url || '#' }}
=======
            <a 
              href={isEditing ? undefined : left.url || '#'}
              className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded text-center w-max" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.leftButtonStyle 
              }}
              onClick={(e) => isEditing && e.preventDefault()}
>>>>>>> khadija
            >
              <InlineEditableText
                value={left.buttonText || 'Button'}
                onBlur={(v) => updateNested('left', 'buttonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
<<<<<<< HEAD
            </EditableElement>
          </EditableElement>
          <EditableElement
            block={block}
            isEditing={isEditing}
            path="rightCardStyle"
            className="sm:w-1/2 mb-10 px-4"
          >
            <EditableElement
              block={block}
              isEditing={isEditing}
              path="rightImageStyle"
              className="rounded-lg h-64 overflow-hidden"
            >
              <img alt="content" className="object-cover object-center h-full w-full" src={right.image} />
            </EditableElement>
=======
            </a>
          </div>
          <div className="sm:w-1/2 mb-10 px-4">
            <div className="rounded-lg h-64 overflow-hidden">
              <img alt="content" className="object-cover object-center h-full w-full" src={right.image} />
            </div>
>>>>>>> khadija
            <InlineEditableText
              tagName="h2"
              value={right.title || 'Right Title'}
              onBlur={(v) => updateNested('right', 'title', v)}
              isEditing={isEditing}
<<<<<<< HEAD
              className="title-font text-2xl font-medium text-[color:var(--color-text,#111827)] mt-6 mb-3"
              style={{ 
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
              className="title-font text-2xl font-medium text-gray-900 mt-6 mb-3"
              style={{ 
                color: block.style?.color, 
>>>>>>> khadija
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
<<<<<<< HEAD
                color: block.style?.color || 'var(--color-text, #111827)', 
=======
                color: block.style?.color, 
>>>>>>> khadija
                fontFamily: block.style?.fontFamily,
                ...content.rightDescriptionStyle 
              }}
            />
<<<<<<< HEAD
            <EditableElement
              as="a"
              block={block}
              isEditing={isEditing}
              path="rightButtonStyle"
              className="flex mx-auto mt-6 text-white bg-[var(--color-primary,#6366f1)] border-0 py-2 px-5 focus:outline-none hover:bg-[var(--color-primary,#4f46e5)] rounded text-center w-max"
              baseStyle={{ fontFamily: block.style?.fontFamily }}
              extraProps={{ href: isEditing ? undefined : right.url || '#' }}
=======
            <a 
              href={isEditing ? undefined : right.url || '#'}
              className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded text-center w-max" 
              style={{ 
                fontFamily: block.style?.fontFamily,
                ...content.rightButtonStyle 
              }}
              onClick={(e) => isEditing && e.preventDefault()}
>>>>>>> khadija
            >
              <InlineEditableText
                value={right.buttonText || 'Button'}
                onBlur={(v) => updateNested('right', 'buttonText', v)}
                isEditing={isEditing}
                tagName="span"
              />
<<<<<<< HEAD
            </EditableElement>
          </EditableElement>
=======
            </a>
          </div>
>>>>>>> khadija
        </div>
      </div>
    </section>
  );
};
