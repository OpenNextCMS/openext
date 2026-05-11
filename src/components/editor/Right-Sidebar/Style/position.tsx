'use client';

import { CSSProperties, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';

type PositionProps = {
  positionOpen: boolean;
  setPositionOpen: (open: boolean) => void;
};

export default function Position({ positionOpen, setPositionOpen }: PositionProps) {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const dispatch = useAppDispatch();

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

  const handlePositionChange = (val: string) => {
    setPositionType(val);
    dispatch(updateSelectedBlockStyles({ position: val as CSSProperties['position'] }));
  };

  const handleOffsetChange = (key: 'top' | 'right' | 'bottom' | 'left', val: string) => {
    setOffsets((prev) => ({ ...prev, [key]: val }));
    const numericVal = val === '' ? undefined : val.endsWith('%') || val.endsWith('vh') || val.endsWith('vw') ? val : `${val}px`;
    dispatch(updateSelectedBlockStyles({ [key]: numericVal }));
  };

  const handleZIndexChange = (val: string) => {
    setZIndex(val);
    dispatch(updateSelectedBlockStyles({ zIndex: val === '' ? undefined : Number(val) }));
  };

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
            value={positionType}
            onValueChange={handlePositionChange}
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
            <div className="space-y-1">
               <Label className="text-[10px] uppercase text-muted-foreground">Top</Label>
               <Input
                placeholder="0"
                className="h-7 text-xs"
                value={offsets.top}
                onChange={(e) => handleOffsetChange('top', e.target.value)}
              />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] uppercase text-muted-foreground">Right</Label>
                <Input
                  placeholder="0"
                  className="h-7 text-xs"
                  value={offsets.right}
                  onChange={(e) => handleOffsetChange('right', e.target.value)}
                />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] uppercase text-muted-foreground">Bottom</Label>
                <Input
                  placeholder="0"
                  className="h-7 text-xs"
                  value={offsets.bottom}
                  onChange={(e) => handleOffsetChange('bottom', e.target.value)}
                />
            </div>
            <div className="space-y-1">
               <Label className="text-[10px] uppercase text-muted-foreground">Left</Label>
                <Input
                  placeholder="0"
                  className="h-7 text-xs"
                  value={offsets.left}
                  onChange={(e) => handleOffsetChange('left', e.target.value)}
                />
            </div>
          </div>

          {/* Z-Index */}
          <div className="space-y-1.5">
            <Label className="text-xs">Z-Index</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={zIndex}
              onChange={(e) => handleZIndexChange(e.target.value)}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
