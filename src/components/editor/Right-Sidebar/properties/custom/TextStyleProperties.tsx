import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import SelectComp from '@/components/ReusableComponents/SelectComp';

type TextStyle = React.CSSProperties & Record<string, unknown>;

export const TextStyleProperties = ({
  label,
  style = {},
  onChange,
}: {
  label: string;
  style: TextStyle;
  onChange: (newStyle: TextStyle) => void;
}) => {
  const updateStyle = (key: string, value: string) => {
    onChange({ ...style, [key]: value });
  };

  return (
    <div className="space-y-3 p-3 border rounded-md bg-muted/5 mt-2">
      <Label className="text-[11px] font-bold text-primary uppercase">{label} Style</Label>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Color</Label>
          <Input 
            type="color" 
            className="h-8 p-1" 
            value={(style.color as string) || '#000000'}
            onChange={(e) => updateStyle('color', e.target.value)} 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Font Size</Label>
          <Input 
            type="text" 
            className="h-8 text-xs" 
            value={(style.fontSize as string) || ''}
            placeholder="e.g. 16px" 
            onChange={(e) => updateStyle('fontSize', e.target.value)} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectComp
          label="Weight"
          value={String(style.fontWeight || '400')}
          onValueChange={(val) => updateStyle('fontWeight', val)}
          options={[
            { label: 'Normal', value: '400' },
            { label: 'Medium', value: '500' },
            { label: 'Bold', value: '700' },
          ]}
        />
        <SelectComp
          label="Align"
          value={(style.textAlign as string) || 'left'}
          onValueChange={(val) => updateStyle('textAlign', val)}
          options={[
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ]}
        />
      </div>
    </div>
  );
};
