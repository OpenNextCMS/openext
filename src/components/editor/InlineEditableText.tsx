'use client';

import React, { useRef, useEffect } from 'react';

interface InlineEditableTextProps {
  value: unknown;
  onBlur: (newValue: string) => void;
  isEditing?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tagName?: keyof React.JSX.IntrinsicElements;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value: rawValue,
  onBlur,
  isEditing = true,
  className,
  style,
  tagName: Tag = 'div',
}) => {
  const value = typeof rawValue === 'string' ? rawValue : rawValue == null ? '' : String(rawValue);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerText !== value) {
      contentRef.current.innerText = value;
    }
  }, [value]);

  const handleBlur = () => {
    if (isEditing && contentRef.current) {
      const newValue = contentRef.current.innerText;
      if (newValue !== value) {
        onBlur(newValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && Tag !== 'p' && Tag !== 'textarea') {
      // Prevent new lines in single-line tags if desired, 
      // but usually we want to allow multiline for most of these components
    }
  };

  const TagComponent = Tag as 'div';
  return (
    <TagComponent
      ref={contentRef as React.RefObject<HTMLDivElement | null>}
      contentEditable={isEditing}
      suppressContentEditableWarning={true}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className} ${isEditing ? 'hover:outline hover:outline-1 hover:outline-primary/50 focus:outline focus:outline-1 focus:outline-primary' : ''}`}
      style={{
        ...style,
        cursor: isEditing ? 'text' : 'inherit',
      }}
    >
      {value}
    </TagComponent>
  );
};
