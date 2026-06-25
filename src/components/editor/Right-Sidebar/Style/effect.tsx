'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';

export default function Effect() {
  const dispatch = useAppDispatch();
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  const [effectsOpen, setEffectsOpen] = useState(false);
  const [boxShadow, setBoxShadow] = useState('none');
  const [textShadow, setTextShadow] = useState('none');
  const [filter, setFilter] = useState('none');
  const [backdropFilter, setBackdropFilter] = useState('none');
  const [opacity, setOpacity] = useState('100');
  const [overflow, setOverflow] = useState('visible');
  const [mixBlendMode, setMixBlendMode] = useState('normal');

  useEffect(() => {
    if (selectedBlock && selectedBlock.style) {
      const {
        boxShadow: box,
        textShadow: text,
        filter: filt,
        backdropFilter: bFilt,
        opacity: op,
        overflow: over,
        mixBlendMode: mix,
      } = selectedBlock.style;

      if (box) setBoxShadow(box as string);
      if (text) setTextShadow(text as string);
      if (filt) setFilter(filt as string);
      if (bFilt) setBackdropFilter(bFilt as string);
      if (op !== undefined) setOpacity(String(Math.round(Number(op) * 100)));
      if (over) setOverflow(over as string);
      if (mix) setMixBlendMode(mix as string);
    }
  }, [selectedBlock]);

  const handleStyleChange = (styles: Record<string, unknown>) => {
    dispatch(updateSelectedBlockStyles(styles as CSSProperties));
  };

  const boxShadowPresets = [
    { name: 'None', value: 'none' },
    { name: 'Small', value: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' },
    { name: 'Medium', value: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)' },
    { name: 'Large', value: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)' },
    { name: 'Extra Large', value: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)' },
    { name: 'Inset', value: 'inset 0 2px 5px rgba(0,0,0,0.15)' },
  ];

  const textShadowPresets = [
    { label: 'None', value: 'none' },
    { label: 'Small', value: '1px 1px 2px black' },
    { label: 'Medium', value: '2px 2px 4px rgba(0,0,0,0.5)' },
    { label: 'Large', value: '3px 3px 6px rgba(0,0,0,0.7)' },
  ];

  const filterOptions = [
    { label: 'None', value: 'none' },
    { label: 'Blur', value: 'blur(4px)' },
    { label: 'Brightness', value: 'brightness(1.5)' },
    { label: 'Contrast', value: 'contrast(1.5)' },
    { label: 'Grayscale', value: 'grayscale(1)' },
    { label: 'Hue Rotate', value: 'hue-rotate(90deg)' },
    { label: 'Invert', value: 'invert(1)' },
    { label: 'Saturate', value: 'saturate(2)' },
    { label: 'Sepia', value: 'sepia(1)' },
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
        <div className="px-3 pb-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Box Shadow</Label>
            <Select
              value={boxShadow}
              onValueChange={(v) => {
                setBoxShadow(v);
                handleStyleChange({ boxShadow: v });
              }}
            >
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
            value={textShadow}
            onValueChange={(v) => {
              setTextShadow(v);
              handleStyleChange({ textShadow: v });
            }}
            options={textShadowPresets}
          />

          <SelectComp
            label="Filter"
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              handleStyleChange({ filter: v });
            }}
            options={filterOptions}
          />
          <SelectComp
            label="Backdrop Filter"
            value={backdropFilter}
            onValueChange={(v) => {
              setBackdropFilter(v);
              handleStyleChange({ backdropFilter: v });
            }}
            options={filterOptions}
          />
          <SelectComp
            label="Opacity"
            value={opacity}
            onValueChange={(v) => {
              setOpacity(v);
              handleStyleChange({ opacity: Number(v) / 100 });
            }}
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
            value={overflow}
            onValueChange={(v) => {
              setOverflow(v);
              handleStyleChange({ overflow: v });
            }}
            options={[
              { label: 'Visible', value: 'visible' },
              { label: 'Hidden', value: 'hidden' },
              { label: 'Scroll', value: 'scroll' },
              { label: 'Auto', value: 'auto' },
            ]}
          />
          <SelectComp
            label="Mix Blend Mode"
            value={mixBlendMode}
            onValueChange={(v) => {
              setMixBlendMode(v);
              handleStyleChange({ mixBlendMode: v });
            }}
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
      </CollapsibleContent>
    </Collapsible>
  );
}
