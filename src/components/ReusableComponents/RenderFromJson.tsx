import { JSX } from 'react';
import RenderBlock from '@/components/editor/renderblock';
import type { Block } from '@/types/index';

type JsonElement = Block;

const RenderFromJson = (element: JsonElement): JSX.Element => {
  // Extract positioning styles for the wrapper to support 'sticky'
  const wrapperStyle: React.CSSProperties = {
    position: element.style?.position,
    top: element.style?.top,
    right: element.style?.right,
    bottom: element.style?.bottom,
    left: element.style?.left,
    zIndex: element.style?.zIndex as React.CSSProperties['zIndex'],
  };

  // Pass remaining styles to the block internally
  return (
    <div key={element.uniqueId} className="w-full" style={wrapperStyle}>
      <RenderBlock block={element} isEditing={false} />
    </div>
  );
};

export default RenderFromJson;