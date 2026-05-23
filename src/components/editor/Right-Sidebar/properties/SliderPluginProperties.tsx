import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SliderPluginPropertiesProps {
  content: any;
  handleJsonContentChange: (content: any, key: string, value: any) => void;
}

export const SliderPluginProperties: React.FC<SliderPluginPropertiesProps> = ({
  content,
  handleJsonContentChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Accent Color</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={content.accentColor || '#eab308'}
              onChange={(e) => handleJsonContentChange(content, 'accentColor', e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border"
            />
            <Input
              className="h-7 text-[10px] font-mono"
              value={content.accentColor || '#eab308'}
              onChange={(e) => handleJsonContentChange(content, 'accentColor', e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground uppercase">Slides To Show</Label>
          <Input
            type="number"
            min={1}
            max={5}
            className="h-7 text-xs"
            value={content.slidesToShow || 1}
            onChange={(e) =>
              handleJsonContentChange(content, 'slidesToShow', parseInt(e.target.value) || 1)
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] text-muted-foreground uppercase">Slides Configuration</Label>
        <Textarea
          className="min-h-[150px] text-[10px] font-mono leading-tight"
          value={JSON.stringify(content.slides || [], null, 2)}
          onChange={(e) => {
            try {
              const slides = JSON.parse(e.target.value);
              handleJsonContentChange(content, 'slides', slides);
            } catch {}
          }}
          placeholder='[ { "title": "Title", "desc": "Description", "image": "..." } ]'
        />
        <p className="text-[9px] text-muted-foreground italic">
          Tip: Add an "image" field to each slide to display pictures.
        </p>
      </div>
    </div>
  );
};
