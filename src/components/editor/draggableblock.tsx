'use client';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';

interface Block {
  id: string;
  label: string;
  type: 'column' | 'text';
  uniqueId?: string;
  content?: string;
  icon?: React.ReactNode | string;
  style?: Record<string, string>;
  description?: string;
  children?: unknown[];
}

const DraggableBlock = ({ block }: { block: Block }) => {
  // Ensure a unique identifier is always present
  const draggableId = block.uniqueId || block.id || uuidv4();

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: draggableId,
    data: {
      ...block,
      uniqueId: draggableId,
      type: block.type || 'text',
      content: block.content || '',
      style: block.style || {},
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex items-center w-full text-left cursor-grab transition-colors duration-200 group-hover:text-primary"
    >
      {/* Render icon if available */}
      {block.icon && typeof block.icon === 'object' && (
        <span className="mr-2">{block.icon}</span>
      )}

      {/* Render block label */}
      <span className="truncate text-sm">
        {block.label}
      </span>
    </div>
  );
};

export default DraggableBlock;