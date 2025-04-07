'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SelectComp from '../../../ReusableComponents/SelectComp';

export default function effect() {
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [boxShadow, setBoxShadow] = useState('none');

  const boxShadowPresets = [
    { name: 'None', value: 'none' },
    { name: 'Small', value: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' },
    { name: 'Medium', value: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)' },
    { name: 'Large', value: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)' },
    { name: 'Extra Large', value: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)' },
    { name: 'Inset', value: 'inset 0 2px 5px rgba(0,0,0,0.15)' },
  ];

  return (
    <Collapsible open={effectsOpen} onOpenChange={setEffectsOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {effectsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Effects</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Box Shadow</Label>
              <Select value={boxShadow} onValueChange={setBoxShadow}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boxShadowPresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.value}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SelectComp
              label="Text Shadow"
              defaultValue="none"
              options={[
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'small' },
                { label: 'Medium', value: 'medium' },
                { label: 'Large', value: 'large' },
              ]}
            />

            <SelectComp
              label="Filter"
              defaultValue="none"
              options={[
                { label: 'None', value: 'none' },
                { label: 'Blur', value: 'blur' },
                { label: 'Brightness', value: 'brightness' },
                { label: 'Contrast', value: 'contrast' },
                { label: 'Grayscale', value: 'grayscale' },
                { label: 'Hue Rotate', value: 'hue-rotate' },
                { label: 'Invert', value: 'invert' },
                { label: 'Saturate', value: 'saturate' },
                { label: 'Sepia', value: 'sepia' },
              ]}
            />

            <SelectComp
              label="Backdrop Filter"
              defaultValue="none"
              options={[
                { label: 'None', value: 'none' },
                { label: 'Blur', value: 'blur' },
                { label: 'Brightness', value: 'brightness' },
                { label: 'Contrast', value: 'contrast' },
                { label: 'Grayscale', value: 'grayscale' },
                { label: 'Hue Rotate', value: 'hue-rotate' },
                { label: 'Invert', value: 'invert' },
                { label: 'Saturate', value: 'saturate' },
                { label: 'Sepia', value: 'sepia' },
              ]}
            />

            <SelectComp
              label="Opacity"
              defaultValue="100"
              options={[
                { label: '0%', value: '0' },
                { label: '25%', value: '25' },
                { label: '50%', value: '50' },
                { label: '75%', value: '75' },
                { label: '100%', value: '100' },
              ]}
            />

            <SelectComp
              label="Overflow"
              defaultValue="visible"
              options={[
                { label: 'Visible', value: 'visible' },
                { label: 'Hidden', value: 'hidden' },
                { label: 'Scroll', value: 'scroll' },
                { label: 'Auto', value: 'auto' },
              ]}
            />

            <SelectComp
              label="Mix Blend Mode"
              defaultValue="normal"
              options={[
                { label: 'Normal', value: 'normal' },
                { label: 'Multiply', value: 'multiply' },
                { label: 'Screen', value: 'screen' },
                { label: 'Overlay', value: 'overlay' },
                { label: 'Darken', value: 'darken' },
                { label: 'Lighten', value: 'lighten' },
                { label: 'Color Dodge', value: 'color-dodge' },
                { label: 'Color Burn', value: 'color-burn' },
                { label: 'Difference', value: 'difference' },
                { label: 'Exclusion', value: 'exclusion' },
              ]}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
