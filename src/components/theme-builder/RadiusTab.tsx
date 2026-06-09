'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateRadius } from '@/redux/themeBuilderSlice';
import type { ThemeRadius } from '@/types/theme';
import { ControlSection, TextField } from './controls';

const KEYS: { key: keyof ThemeRadius; label: string }[] = [
  { key: 'sm', label: 'Small' },
  { key: 'md', label: 'Medium' },
  { key: 'lg', label: 'Large' },
  { key: 'xl', label: 'Extra Large' },
  { key: '2xl', label: '2X Large' },
];

export function RadiusTab() {
  const dispatch = useAppDispatch();
  const radius = useAppSelector((s) => s.themeBuilder.draft.radius);

  return (
    <ControlSection title="Border radius">
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map(({ key, label }) => (
          <TextField
            key={key}
            label={label}
            value={radius[key]}
            onChange={(v) => dispatch(updateRadius({ key, value: v }))}
            placeholder="8px"
          />
        ))}
      </div>
    </ControlSection>
  );
}
