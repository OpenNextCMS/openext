'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateTypography } from '@/redux/themeBuilderSlice';
import { ControlSection, TextField } from './controls';

export function TypographyTab() {
  const dispatch = useAppDispatch();
  const typography = useAppSelector((s) => s.themeBuilder.draft.typography);

  return (
    <ControlSection title="Typography">
      <TextField
        label="Heading font"
        value={typography.headingFont}
        onChange={(v) => dispatch(updateTypography({ key: 'headingFont', value: v }))}
        placeholder="Inter, system-ui, sans-serif"
      />
      <TextField
        label="Body font"
        value={typography.bodyFont}
        onChange={(v) => dispatch(updateTypography({ key: 'bodyFont', value: v }))}
        placeholder="Inter, system-ui, sans-serif"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Base size"
          value={typography.baseFontSize}
          onChange={(v) => dispatch(updateTypography({ key: 'baseFontSize', value: v }))}
          placeholder="16px"
        />
        <TextField
          label="Line height"
          value={typography.lineHeight}
          onChange={(v) => dispatch(updateTypography({ key: 'lineHeight', value: v }))}
          placeholder="1.6"
        />
      </div>
    </ControlSection>
  );
}
