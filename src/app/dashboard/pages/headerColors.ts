export interface HeaderColorPreset {
  id: string;
  label: string;
  backgroundColor: string;
  color: string;
}

export const headerColorPresets: HeaderColorPreset[] = [
  { id: 'light', label: 'Light', backgroundColor: '#ffffff', color: '#111111' },
  { id: 'dark', label: 'Dark', backgroundColor: '#111111', color: '#ffffff' },
  { id: 'midnight', label: 'Midnight', backgroundColor: '#0f172a', color: '#e2e8f0' },
  { id: 'brand', label: 'Brand', backgroundColor: '#2563eb', color: '#ffffff' },
  { id: 'royal', label: 'Royal', backgroundColor: '#4338ca', color: '#e0e7ff' },
  { id: 'forest', label: 'Forest', backgroundColor: '#064e3b', color: '#a7f3d0' },
  { id: 'mint', label: 'Mint', backgroundColor: '#d1fae5', color: '#064e3b' },
  { id: 'accent', label: 'Accent', backgroundColor: '#f59e0b', color: '#1f2937' },
  { id: 'sunset', label: 'Sunset', backgroundColor: '#fb923c', color: '#7c2d12' },
  { id: 'rose', label: 'Rose', backgroundColor: '#fce7f3', color: '#831843' },
  { id: 'cream', label: 'Cream', backgroundColor: '#fef3c7', color: '#78350f' },
  { id: 'steel', label: 'Steel', backgroundColor: '#475569', color: '#f1f5f9' },
  { id: 'transparent', label: 'Transparent', backgroundColor: 'transparent', color: '#111111' },
];

export function matchPreset(
  backgroundColor?: string,
  color?: string
): HeaderColorPreset | null {
  if (!backgroundColor && !color) return null;
  return (
    headerColorPresets.find(
      (p) =>
        (p.backgroundColor || '').toLowerCase() === (backgroundColor || '').toLowerCase() &&
        (p.color || '').toLowerCase() === (color || '').toLowerCase()
    ) || null
  );
}
