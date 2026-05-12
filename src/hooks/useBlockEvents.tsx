import { BlockData } from '@/types';

function resolveRedirectUrl(raw: string): string {
  const value = raw.trim();
  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/') ||
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:')
  ) {
    return value;
  }
  return `https://${value}`;
}

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
      window.location.href = resolveRedirectUrl(onClickValue);
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
    window.location.href = resolveRedirectUrl(events.onClickValue);
  }
};
