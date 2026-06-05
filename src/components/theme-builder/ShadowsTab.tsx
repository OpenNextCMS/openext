'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateShadow } from '@/redux/themeBuilderSlice';
import type { ThemeShadows } from '@/types/theme';
import { ControlSection, TextField } from './controls';

const KEYS: { key: keyof ThemeShadows; label: string }[] = [
  { key: 'sm', label: 'Small' },
  { key: 'md', label: 'Medium' },
  { key: 'lg', label: 'Large' },
];

export function ShadowsTab() {
  const dispatch = useAppDispatch();
  const shadows = useAppSelector((s) => s.themeBuilder.draft.shadows);

  return (
    <ControlSection title="Shadows">
      {KEYS.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <TextField
            label={label}
            value={shadows[key]}
            onChange={(v) => dispatch(updateShadow({ key, value: v }))}
            placeholder="0 4px 6px -1px rgba(0,0,0,0.1)"
          />
          <div
            className="h-12 rounded-md bg-white"
            style={{ boxShadow: shadows[key] }}
            aria-hidden
          />
        </div>
      ))}
    </ControlSection>
  );
}
