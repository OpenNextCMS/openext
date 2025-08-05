import { JSX } from 'react';
import Image from 'next/image';

const typeToTag: Record<string, keyof JSX.IntrinsicElements> = {
  text: 'div',
  button: 'button',
  image: 'img',
  column: 'div',
};

type JsonElement = {
  content: string;
  type: string;
  icon?: string;
  uniqueId: string;
  style?: React.CSSProperties;
  children?: JsonElement[][];
};

const renderFromJson = (element: JsonElement): JSX.Element => {
  const Tag = typeToTag[element.type] || 'div';
  const style = element.style || {};

  if (element.type === 'image') {
    return (
      <Image
        alt={element.content}
        key={element.uniqueId}
        src={element.content}
        style={style}
      />
    );
  }

  return (
    <Tag key={element.uniqueId} style={style}>
      {/* Render content for non-column types */}
      {element.type !== 'column' && element.content}

      {/* Recursively render children if it's a column */}
      {element.children &&
        element.children.map((row, rowIndex) => (
          <div key={rowIndex} style={{ display: 'flex', gap: '16px' }}>
            {row.map((child) => renderFromJson(child))}
          </div>
        ))}
    </Tag>
  );
};

export default renderFromJson;