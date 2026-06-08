'use client';

import { Trash2, Clock } from 'lucide-react';
import { BlockRendererProps, BlockData } from '@/types/index';
import { useAppDispatch } from '@/redux/hooks';
import { removeBlock, setSelectedBlock, setSelectedLabel } from '@/redux/canvasSlice';
import { useState, useEffect } from 'react';
import { useBlockEvents } from '@/hooks/useBlockEvents';

export const CountdownBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: '0', hours: '00', minutes: '00', seconds: '00' });
  const { handleClick } = useBlockEvents(block as BlockData, isEditing);

  useEffect(() => {
    // This effect creates a ticking clock
    const timer = setInterval(() => {
      // Logic would go here to calculate time until a specific date
      // For now, we simulate the "0 00 00 00" static view from your screenshot
      setTimeLeft({ days: '0', hours: '00', minutes: '00', seconds: '00' });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRemove = () => {
    dispatch(removeBlock(block.uniqueId ?? ''));
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trigger custom events if not in editing mode
    handleClick(e);

    if (!isEditing) return;
    dispatch(setSelectedBlock(block as BlockData));
    dispatch(setSelectedLabel('Countdown Timer'));
  };

  return (
    <div
      onClick={handleSelect}
      className="relative mb-8 group transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...block.style,
        outline: isHovered && isEditing ? '1px dashed #3b82f6' : 'none',
      }}
    >
      {isEditing && isHovered && (
        <div className="absolute -top-3 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1 z-10">
          <Clock className="w-3 h-3" />
          <span>Countdown</span>
        </div>
      )}

      {isEditing && isHovered && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <button onClick={handleRemove} className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      <div
        className="flex gap-2 sm:gap-4 h-full flex-wrap justify-center sm:justify-start"
      >
        {Object.entries(timeLeft).map(([label, value]) => (
          <div key={label} className="flex flex-col items-center min-w-[60px]">
            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-light mb-1">{value}</div>
            <div className="w-full h-0.5 mb-1" style={{ backgroundColor: 'var(--color-primary, #22d3ee)' }} />
            <div className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
