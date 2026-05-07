import { JSX } from 'react';
import RenderBlock from '@/components/editor/renderblock';
import type { Block } from '@/types/index';

type JsonElement = Block;

const RenderFromJson = (element: JsonElement): JSX.Element => {
  // Use the standard RenderBlock component to ensure consistency
  // across the entire application (Canvas, Preview, and JSON Renderer)
  return (
    <div key={element.uniqueId} className="w-full">
      <RenderBlock block={element} isEditing={false} />
    </div>
  );
};

export default RenderFromJson;