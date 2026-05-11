'use client';

import { ImageIcon, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { useBlockEvents } from '@/hooks/useBlockEvents';

interface ImageContent {
  src: string;
  alt: string;
  caption?: string;
}

const defaultImage: ImageContent = {
  src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  alt: 'Office workspace',
  caption: '',
};

const parseImageContent = (content?: string): ImageContent => {
  if (!content) return defaultImage;

  try {
    const parsed = JSON.parse(content) as Partial<ImageContent>;
    return {
      src: typeof parsed.src === 'string' ? parsed.src : defaultImage.src,
      alt: parsed.alt || defaultImage.alt,
      caption: parsed.caption || '',
    };
  } catch {
    return {
      ...defaultImage,
      src: content,
    };
  }
};

export const ImageBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  const image = parseImageContent(block.content);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Image Block'));
  };

  return (
    <figure
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative mb-4"
      style={{
        width: '100%',
        margin: 0,
        overflow: 'hidden',
        borderRadius: '8px',
        ...block.style,
        cursor: isEditing ? 'pointer' : block.events?.onClick === 'none' ? 'default' : 'pointer',
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <ImageIcon className="h-3 w-3" />
          <span>Image</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <button
            onClick={handleRemove}
            className="rounded bg-red-500 p-1 text-white hover:bg-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {image.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt={image.alt}
          style={{
            display: 'block',
            width: '100%',
            height: block.style?.height || '220px',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          aria-label={image.alt}
          style={{
            width: '100%',
            height: block.style?.height || '220px',
            backgroundColor: block.style?.backgroundColor || '#e5e7eb',
          }}
        />
      )}
      {image.caption && (
        <figcaption
          style={{
            padding: '10px 12px',
            color: block.style?.color || '#4b5563',
            backgroundColor: block.style?.backgroundColor || '#ffffff',
            fontSize: '14px',
          }}
        >
          {image.caption}
        </figcaption>
      )}
    </figure>
  );
};
