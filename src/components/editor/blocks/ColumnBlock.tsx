'use client';

import { GripVertical, Edit2, Trash2, Heart } from 'lucide-react';
import { BlockRendererProps } from '@/types/index';
import { getIconForBlock } from './icons';
import { ColumnDropZone } from './ColumnDropZone';
import RenderBlock from '../renderblock';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock } from '@/redux/canvasSlice';

export const ColumnBlock = ({ block }: BlockRendererProps) => {
  const dispatch = useAppDispatch();

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const blockStyle = typeof block.style === 'object' ? block.style : {};

  return (
    <div
      className="group"
      onMouseEnter={() => {
        document.querySelectorAll(`.hover-${block.uniqueId}`).forEach((el) => {
          (el as HTMLElement).style.opacity = '1';
          (el as HTMLElement).style.pointerEvents = 'auto';
        });
      }}
      onMouseLeave={() => {
        document.querySelectorAll(`.hover-${block.uniqueId}`).forEach((el) => {
          (el as HTMLElement).style.opacity = '0';
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      }}
      style={{
        position: 'relative',
        marginBottom: '1.5rem',
        ...blockStyle,
      }}
    >
      {/* Top Label */}
      <div
        id={`label-${block.uniqueId}`}
        className={`hover-${block.uniqueId}`}
        style={{
          position: 'absolute',
          top: '-12px',
          left: '8px',
          backgroundColor: '#3b82f6',
          color: 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {getIconForBlock(block.icon as string | undefined)}
        <span style={{ marginLeft: '4px' }}>Column Layout</span>
      </div>

      {/* Top Right Buttons */}
      <div
        id={`actions-${block.uniqueId}`}
        className={`hover-${block.uniqueId}`}
        style={{
          position: 'absolute',
          top: '-12px', // Move it higher above the main column box
          right: '0px',
          display: 'flex',
          gap: '6px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <button
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '4px',
          }}
        >
          <Edit2 style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={handleRemove}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '4px 6px',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Trash2 style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Bottom Right Heart */}
      <div
        className={`hover-${block.uniqueId}`}
        style={{
          position: 'absolute',
          bottom: '-12px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          opacity: 0,
          transition: 'opacity 0.2s ease-in-out',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <button
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px',
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Heart style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          border: '1px solid rgba(229, 231, 235, 0)',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {block.children?.map((childBlocks, index) => (
          <ColumnDropZone key={`${block.uniqueId}-col-${index}`} columnIndex={index} block={block}>
            {Array.isArray(childBlocks) && childBlocks.length > 0 ? (
              childBlocks.map((child) => <RenderBlock key={child.uniqueId} block={child} />)
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px',
                  color: '#6b7280',
                }}
              >
                <GripVertical style={{ width: 20, height: 20, marginBottom: '8px' }} />
                <p style={{ fontSize: '14px' }}>Drop blocks here</p>
              </div>
            )}
          </ColumnDropZone>
        ))}
      </div>
    </div>
  );
};
