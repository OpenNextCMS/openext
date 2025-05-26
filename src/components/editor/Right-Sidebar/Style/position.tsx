'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectComp from '../../../ReusableComponents/SelectComp';

type PositionProps = {
  positionOpen: boolean;
  setPositionOpen: (open: boolean) => void;
  marginChanges: (value: string, position: 'top' | 'right' | 'bottom' | 'left' | 'all') => void;
};

export default function position({ positionOpen, setPositionOpen, marginChanges }: PositionProps) {
  return (
    <Collapsible open={positionOpen} onOpenChange={setPositionOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {positionOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Position</span>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          <SelectComp
            label="Position"
            defaultValue="static"
            options={[
              { label: 'Static', value: 'static' },
              { label: 'Relative', value: 'relative' },
              { label: 'Absolute', value: 'absolute' },
              { label: 'Fixed', value: 'fixed' },
              { label: 'Sticky', value: 'sticky' },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Top"
              className="h-7 text-xs"
              onChange={(e) => marginChanges(e.target.value, 'top')}
            />
            <Input
              placeholder="Right"
              className="h-7 text-xs"
              onChange={(e) => marginChanges(e.target.value, 'right')}
            />
            <Input
              placeholder="Bottom"
              className="h-7 text-xs"
              onChange={(e) => marginChanges(e.target.value, 'bottom')}
            />
            <Input
              placeholder="Left"
              className="h-7 text-xs"
              onChange={(e) => marginChanges(e.target.value, 'left')}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Z-Index</Label>
            <Input className="h-8 text-xs" type="number" defaultValue="0" />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
