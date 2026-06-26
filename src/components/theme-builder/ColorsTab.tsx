'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateColor } from '@/redux/themeBuilderSlice';
import type { ThemeColors } from '@/types/theme';
import { ColorField, ControlSection, ContrastWarning } from './controls';

const COLOR_KEYS: (keyof ThemeColors)[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
  'muted',
  'success',
  'warning',
  'danger',
];

export function ColorsTab() {
  const dispatch = useAppDispatch();
  const colors = useAppSelector((s) => s.themeBuilder.draft.colors);

  return (
    <ControlSection title="Colors">
      {COLOR_KEYS.map((key) => (
        <ColorField
          key={key}
          label={key}
          value={colors[key]}
          onChange={(value) => dispatch(updateColor({ key, value }))}
        />
      ))}
      <ContrastWarning
        fg={colors.text}
        bg={colors.background}
        message="Text / background contrast is low"
      />
      <ContrastWarning
        fg="#ffffff"
        bg={colors.primary}
        min={3}
        message="White text on primary may be hard to read"
      />
    </ControlSection>
  );
}
