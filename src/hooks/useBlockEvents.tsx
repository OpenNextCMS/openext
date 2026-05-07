import { BlockData } from '@/types';

export const useBlockEvents = (block: BlockData, isEditing: boolean) => {
  const handleClick = (e: React.MouseEvent) => {
    // Only trigger events when NOT in editing mode
    if (isEditing) return;

    const { onClick, onClickValue } = block.events || {};

    if (!onClick || onClick === 'none') return;

    // Prevent any default behavior if needed
    e.preventDefault();
    e.stopPropagation();

    if (onClick === 'alert') {
      alert(onClickValue || 'Alert!');
    } else if (onClick === 'redirect' && onClickValue) {
      // Basic validation for URL
      const url = onClickValue.startsWith('http') ? onClickValue : `https://${onClickValue}`;
      console.log(`Redirecting to: ${url}`);
      window.location.href = url;
    }
  };

  return { handleClick };
};

/**
 * A utility function to trigger events for non-component based rendering (like renderFromJson)
 */
export const triggerBlockEvent = (events: BlockData['events']) => {
  if (!events || !events.onClick || events.onClick === 'none') return;

  if (events.onClick === 'alert') {
    alert(events.onClickValue || 'Alert!');
  } else if (events.onClick === 'redirect' && events.onClickValue) {
    const url = events.onClickValue.startsWith('http') ? events.onClickValue : `https://${events.onClickValue}`;
    window.location.href = url;
  }
};
