'use client';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateLayout } from '@/redux/themeBuilderSlice';
import { ControlSection, TextField } from './controls';

export function LayoutTab() {
  const dispatch = useAppDispatch();
  const layout = useAppSelector((s) => s.themeBuilder.draft.layout);

  return (
    <ControlSection title="Layout">
      <TextField
        label="Container width"
        value={layout.containerWidth}
        onChange={(v) => dispatch(updateLayout({ key: 'containerWidth', value: v }))}
        placeholder="1200px or 100%"
      />
      <TextField
        label="Section spacing"
        value={layout.sectionSpacing}
        onChange={(v) => dispatch(updateLayout({ key: 'sectionSpacing', value: v }))}
        placeholder="80px"
      />
    </ControlSection>
  );
}
