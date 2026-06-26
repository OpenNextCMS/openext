'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateSelectedBlockHoverStyles } from '@/redux/canvasSlice';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// ✅ RGB to HEX utility
function rgbToHex(rgb: string) {
  const result = rgb.match(/\d+/g);
  if (!result) return '#000000';
  return (
    '#' +
    result
      .slice(0, 3)
      .map((num) => parseInt(num).toString(16).padStart(2, '0'))
      .join('')
  );
}

const Hover = () => {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const dispatch = useAppDispatch();
  const [hoverOpen, setHoverOpen] = useState(false);
  
  // Hover states
  const [hoverBackgroundColor, setHoverBackgroundColor] = useState('#3b82f6');
  const [hoverColor, setHoverColor] = useState('#ffffff');

  // ✅ Sync from selectedBlock when changed
  useEffect(() => {
    if (!selectedBlock?.hoverStyle) return;

    const hoverStyle = selectedBlock.hoverStyle as React.CSSProperties;

    if (hoverStyle.backgroundColor) {
      const rawBg = String(hoverStyle.backgroundColor);
      const hexBg = rawBg.includes('rgb') ? rgbToHex(rawBg) : rawBg;
      setHoverBackgroundColor(hexBg);
    }

    if (hoverStyle.color) {
      const rawColor = String(hoverStyle.color);
      const hexColor = rawColor.includes('rgb') ? rgbToHex(rawColor) : rawColor;
      setHoverColor(hexColor);
    }
  }, [selectedBlock]);

  const handleHoverStyleChange = (property: string, value: string) => {
    dispatch(updateSelectedBlockHoverStyles({ [property]: value }));
  };

  // Only show for buttons (as per request, but could be expanded)
  if (selectedBlock?.type !== 'button') return null;

  return (
    <Collapsible open={hoverOpen} onOpenChange={setHoverOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {hoverOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Hover State</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-4">
          {/* Hover Background Color */}
          <div className="space-y-1.5">
            <Label className="text-xs">Hover Background Color</Label>
            <div className="flex gap-2 items-center">
              <div 
                className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                style={{ backgroundColor: hoverBackgroundColor }}
              >
                <input
                  type="color"
                  value={hoverBackgroundColor}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setHoverBackgroundColor(newColor);
                    handleHoverStyleChange('backgroundColor', newColor);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <Input 
                className="h-8 text-xs flex-1"
                value={hoverBackgroundColor}
                onChange={(e) => {
                  setHoverBackgroundColor(e.target.value);
                  handleHoverStyleChange('backgroundColor', e.target.value);
                }}
              />
            </div>
          </div>

          {/* Hover Font Color */}
          <div className="space-y-1.5">
            <Label className="text-xs">Hover Font Color</Label>
            <div className="flex gap-2 items-center">
              <div 
                className="w-10 h-8 rounded border shadow-sm relative overflow-hidden shrink-0 cursor-pointer"
                style={{ backgroundColor: hoverColor }}
              >
                <input
                  type="color"
                  value={hoverColor}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setHoverColor(newColor);
                    handleHoverStyleChange('color', newColor);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <Input 
                className="h-8 text-xs flex-1"
                value={hoverColor}
                onChange={(e) => {
                  setHoverColor(e.target.value);
                  handleHoverStyleChange('color', e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Hover;
