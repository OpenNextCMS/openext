'use client';

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import InputSelect from '../../../ReusableComponents/SizeInput';
import SelectComp from '../../../ReusableComponents/SelectComp';

export default function border() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {open ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
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
            <Input className="h-8 text-xs flex-1" type="color" />
          </div>

          {/* Border Width */}
          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Width</Label>
            <InputSelect
              defaultValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>

          {/* Border Style */}
          <SelectComp
            label="Border Style"
            defaultValue="solid"
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
