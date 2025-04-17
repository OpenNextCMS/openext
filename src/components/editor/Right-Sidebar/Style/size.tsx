'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectSize from '@/components/ReusableComponents/SizeInput';

export default function Size() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center justify-between gap-12">
            <span className="font-medium text-sm">Size</span>
            <CollapsibleContent>
              <SelectSize
                defaultValue="px"
                options={[
                  { label: 'px', value: 'px' },
                  { label: 'rem', value: 'rem' },
                  { label: '%', value: '%' },
                ]}
              />
            </CollapsibleContent>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3 mt-3">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Width</Label>
              <div className="flex gap-2 border border-border rounded-md">
                <Input placeholder="8" />
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs mb-1.5 block">Height</Label>
              <div className="flex gap-2 border border-border rounded-md">
                <Input placeholder="8" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Min Width', 'Max Width', 'Min Height', 'Max Height'].map((label, index) => (
              <div key={index}>
                <Label className="text-xs mb-1.5 block">{label}</Label>
                <div className="flex gap-2 border border-border rounded-md">
                  <Input placeholder="8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
