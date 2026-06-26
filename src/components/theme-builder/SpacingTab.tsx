'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateSpacing } from '@/redux/themeBuilderSlice';
import type { ThemeSpacing } from '@/types/theme';
import { ControlSection, TextField } from './controls';

const KEYS: (keyof ThemeSpacing)[] = ['xs', 'sm', 'md', 'lg', 'xl'];

export function SpacingTab() {
  const dispatch = useAppDispatch();
  const spacing = useAppSelector((s) => s.themeBuilder.draft.spacing);

  return (
    <ControlSection title="Spacing scale">
      <div className="grid grid-cols-2 gap-3">
        {KEYS.map((key) => (
          <TextField
            key={key}
            label={key.toUpperCase()}
            value={spacing[key]}
            onChange={(v) => dispatch(updateSpacing({ key, value: v }))}
            placeholder="16px"
          />
        ))}
      </div>
    </ControlSection>
  );
}
