'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { useAppSelector } from '@/redux/hooks';

type PositionProps = {
  positionOpen: boolean;
  setPositionOpen: (open: boolean) => void;
  marginChanges: (value: string, position: 'top' | 'right' | 'bottom' | 'left' | 'all') => void;
};

export default function Position({ positionOpen, setPositionOpen, marginChanges }: PositionProps) {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  const [positionType, setPositionType] = useState('static');
  const [offsets, setOffsets] = useState({
    top: '',
    right: '',
    bottom: '',
    left: '',
  });
  const [zIndex, setZIndex] = useState('');

  useEffect(() => {
    if (selectedBlock) {
      const style = selectedBlock.style || {};

      setPositionType(style.position || 'static');
      setOffsets({
        top: style.top !== undefined ? String(style.top).replace('px', '') : '',
        right: style.right !== undefined ? String(style.right).replace('px', '') : '',
        bottom: style.bottom !== undefined ? String(style.bottom).replace('px', '') : '',
        left: style.left !== undefined ? String(style.left).replace('px', '') : '',
      });
      setZIndex(style.zIndex !== undefined ? String(style.zIndex) : '');
    }
  }, [selectedBlock]);

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
          {/* Position Select */}
          <SelectComp
            label="Position"
            defaultValue={positionType}
            value={positionType}
            onValueChange={(val: string) => setPositionType(val)}
            options={[
              { label: 'Static', value: 'static' },
              { label: 'Relative', value: 'relative' },
              { label: 'Absolute', value: 'absolute' },
              { label: 'Fixed', value: 'fixed' },
              { label: 'Sticky', value: 'sticky' },
            ]}
          />

          {/* Offsets */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Top"
              className="h-7 text-xs"
              value={offsets.top}
              onChange={(e) => {
                const val = e.target.value;
                setOffsets((prev) => ({ ...prev, top: val }));
                marginChanges(val, 'top');
              }}
            />
            <Input
              placeholder="Right"
              className="h-7 text-xs"
              value={offsets.right}
              onChange={(e) => {
                const val = e.target.value;
                setOffsets((prev) => ({ ...prev, right: val }));
                marginChanges(val, 'right');
              }}
            />
            <Input
              placeholder="Bottom"
              className="h-7 text-xs"
              value={offsets.bottom}
              onChange={(e) => {
                const val = e.target.value;
                setOffsets((prev) => ({ ...prev, bottom: val }));
                marginChanges(val, 'bottom');
              }}
            />
            <Input
              placeholder="Left"
              className="h-7 text-xs"
              value={offsets.left}
              onChange={(e) => {
                const val = e.target.value;
                setOffsets((prev) => ({ ...prev, left: val }));
                marginChanges(val, 'left');
              }}
            />
          </div>

          {/* Z-Index */}
          <div className="space-y-1.5">
            <Label className="text-xs">Z-Index</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={zIndex}
              onChange={(e) => setZIndex(e.target.value)}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
