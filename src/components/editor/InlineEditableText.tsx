'use client';

import React, { useRef, useEffect } from 'react';

interface InlineEditableTextProps {
  value: string;
  onBlur: (newValue: string) => void;
  isEditing?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tagName?: keyof JSX.IntrinsicElements;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onBlur,
  isEditing = true,
  className,
  style,
  tagName: Tag = 'div',
}) => {
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

  return (
    <Tag
      ref={contentRef as any}
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
    </Tag>
  );
};
