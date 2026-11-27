import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { getEditorFontPreviewStack } from '@/lib/editor/fontFamilies';

interface SelectCompProps {
  label?: string;
  defaultValue?: string;
  value?: string;
  options: { label: string; value: string }[];
  onValueChange?: (value: string) => void;
  /** When true, each option is rendered in its own font-family for preview. */
  previewFonts?: boolean;
}

export default function SelectComp({
  label = 'Font Weight',
  defaultValue = '400',
  value,
  onValueChange,
  options,
  previewFonts = false,
}: SelectCompProps) {
  const triggerFont = previewFonts && value ? getEditorFontPreviewStack(value) : undefined;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs w-16">{label}</Label>
      <div className="flex gap-2 border border-border rounded-md">
        <Select value={value} onValueChange={onValueChange} defaultValue={defaultValue}>
          <SelectTrigger className="h-8 text-xs" style={triggerFont ? { fontFamily: triggerFont } : undefined}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                style={
                  previewFonts
                    ? { fontFamily: getEditorFontPreviewStack(option.value) }
                    : undefined
                }
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
