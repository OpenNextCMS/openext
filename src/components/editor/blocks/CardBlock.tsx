'use client';

import { CreditCard, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BlockData, BlockRendererProps } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { useBlockEvents } from '@/hooks/useBlockEvents';

interface CardContent {
  image?: string;
  eyebrow?: string;
  title: string;
  body: string;
  buttonText?: string;
}

const defaultCard: CardContent = {
  image:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  eyebrow: 'Platform',
  title: 'Web Development',
  body: 'Build responsive sections, service cards, and rich content blocks with reusable editor elements.',
  buttonText: 'Read More',
};

const parseCardContent = (content?: string): CardContent => {
  if (!content) return defaultCard;

  try {
    const parsed = JSON.parse(content) as Partial<CardContent>;
    return {
      image: parsed.image || defaultCard.image,
      eyebrow: parsed.eyebrow || '',
      title: parsed.title || defaultCard.title,
      body: parsed.body || defaultCard.body,
      buttonText: parsed.buttonText || '',
    };
  } catch {
    return {
      ...defaultCard,
      title: content,
    };
  }
};

export const CardBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);
  const card = parseCardContent(block.content);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Card Block'));
  };

  return (
    <article
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative mb-4"
      style={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        color: '#111827',
        border: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
        ...block.style,
        cursor: isEditing ? 'pointer' : block.events?.onClick === 'none' ? 'default' : 'pointer',
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 z-10 flex items-center gap-1 rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white">
          <CreditCard className="h-3 w-3" />
          <span>Card</span>
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

      {card.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image}
            alt={card.title}
            style={{
              display: 'block',
              width: '100%',
              height: '180px',
              objectFit: 'cover',
            }}
          />
        </>
      )}

      <div style={{ padding: '22px' }}>
        {card.eyebrow && (
          <p
            style={{
              margin: '0 0 8px',
              color: '#00a6b2',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {card.eyebrow}
          </p>
        )}
        <h3 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 700, lineHeight: 1.25 }}>
          {card.title}
        </h3>
        <p style={{ margin: 0, color: '#4b5563', fontSize: '15px', lineHeight: 1.7 }}>
          {card.body}
        </p>
        {card.buttonText && (
          <span
            style={{
              display: 'inline-flex',
              marginTop: '18px',
              padding: '9px 14px',
              borderRadius: '999px',
              backgroundColor: '#ffc400',
              color: '#111827',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {card.buttonText}
          </span>
        )}
      </div>
    </article>
  );
};
