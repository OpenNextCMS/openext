'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import InputSelect from '@/components/ReusableComponents/SizeInput';
import SelectComp from '@/components/ReusableComponents/SelectComp';

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

export default function Border() {
  const [open, setOpen] = useState(false);
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidth, setBorderWidth] = useState('1');
  const [borderUnit, setBorderUnit] = useState('px');
  const [borderStyle, setBorderStyle] = useState('solid');

  useEffect(() => {
    if (selectedBlock?.style?.border && typeof selectedBlock.style.border === 'string') {
      const parts = selectedBlock.style.border.split(' '); // e.g., "1px dashed rgb(255, 0, 0)"
      if (parts.length >= 3) {
        const width = parts[0]; // "1px"
        const style = parts[1]; // "dashed"
        const color = parts.slice(2).join(' '); // "rgb(255, 0, 0)"

        setBorderWidth(width.replace(/[^0-9.]/g, ''));
        setBorderUnit(width.replace(/[0-9.]/g, '') || 'px');
        setBorderStyle(style);
        setBorderColor(rgbToHex(color));
      }
    }
  }, [selectedBlock]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Border</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          {/* Border Color */}
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Color</Label>
            <Input
              className="h-8 text-xs flex-1"
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
            />
          </div>

          {/* Border Width */}
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Width</Label>
            <InputSelect
              placeholder="1"
              unitValue={borderUnit}
              value={borderWidth}
              onValueChange={(unit) => setBorderUnit(unit)}
              onUnitChange={(val) => setBorderWidth(val)}
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>

          {/* ✅ Fixed: Controlled Border Style Select */}
          <SelectComp
            label="Border Style"
            value={borderStyle}
            onValueChange={setBorderStyle}
            options={[
              { label: 'Solid', value: 'solid' },
              { label: 'Dashed', value: 'dashed' },
              { label: 'Dotted', value: 'dotted' },
              { label: 'Double', value: 'double' },
              { label: 'None', value: 'none' },
            ]}
          />

          {/* Border Radius */}
          <div className="space-y-1.5">
            <Label className="text-xs">Border Radius</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input className="h-8 text-xs" placeholder="Top Left" />
              <Input className="h-8 text-xs" placeholder="Top Right" />
              <Input className="h-8 text-xs" placeholder="Bottom Left" />
              <Input className="h-8 text-xs" placeholder="Bottom Right" />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
