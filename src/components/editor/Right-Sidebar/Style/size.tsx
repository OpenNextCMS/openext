'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';
import InputSelect from '@/components/ReusableComponents/SizeInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Size() {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const isTyping = useRef(false);

  // Parse CSS values like "100px", "50%", "auto"
  const parseValue = useCallback((value: any) => {
    if (value === undefined || value === null || value === 'auto' || value === '') {
      return { val: '', unit: 'px' };
    }
    const strValue = String(value);
    
    // Check for just a number string
    if (!isNaN(Number(strValue))) {
      return { val: strValue, unit: 'px' };
    }

    const match = strValue.match(/^([\d.]+)(\D*)$/);
    if (!match) return { val: '', unit: 'px' };
    
    return { 
      val: match[1], 
      unit: (match[2].trim() || 'px') 
    };
  }, []);

  const [styles, setStyles] = useState({
    width: { val: '', unit: 'px' },
    height: { val: '', unit: 'px' },
    minWidth: { val: '', unit: 'px' },
    maxWidth: { val: '', unit: 'px' },
    minHeight: { val: '', unit: 'px' },
    maxHeight: { val: '', unit: 'px' },
  });

  // Sync state from Redux whenever the selected block or its style changes
  useEffect(() => {
    // Skip sync while typing to prevent cursor jump/clearing
    if (isTyping.current) return;

    const s = (selectedBlock?.style || {}) as any;
    setStyles({
      width: parseValue(s.width),
      height: parseValue(s.height),
      minWidth: parseValue(s.minWidth),
      maxWidth: parseValue(s.maxWidth),
      minHeight: parseValue(s.minHeight),
      maxHeight: parseValue(s.maxHeight),
    });
  }, [selectedBlock, parseValue]);

  const handleStyleChange = (prop: string, val: string, unit: string) => {
    isTyping.current = true;
    
    // Update local state first for instant response
    setStyles(prev => ({
      ...prev,
      [prop]: { val, unit }
    }));

    // Construct the CSS value
    const finalValue = val === '' ? 'auto' : `${val}${unit}`;
    
    // Dispatch to Redux
    dispatch(updateSelectedBlockStyles({ [prop]: finalValue }));
    
    // After update, allow sync again (using a small delay to let Redux state settle)
    setTimeout(() => {
      isTyping.current = false;
    }, 100);
  };

  const sizeProperties = [
    { label: 'Width', prop: 'width', tooltip: 'Sets the width of the element' },
    { label: 'Height', prop: 'height', tooltip: 'Sets the height of the element' },
    { label: 'Min Width', prop: 'minWidth', tooltip: 'Minimum width the element can shrink to' },
    { label: 'Max Width', prop: 'maxWidth', tooltip: 'Maximum width the element can grow to' },
    { label: 'Min Height', prop: 'minHeight', tooltip: 'Minimum height the element can shrink to' },
    { label: 'Max Height', prop: 'maxHeight', tooltip: 'Maximum height the element can grow to' },
  ];

  if (!selectedBlock) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card/50">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-muted/50">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Size</span>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-4 pt-1 space-y-5">
          <div className="flex flex-col gap-y-4">
            {sizeProperties.map(({ label, prop, tooltip }) => (
              <div key={prop} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-[11px] text-muted-foreground/90 uppercase font-bold tracking-normal">
                    {label}
                  </Label>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/30 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[11px] p-2 max-w-[200px]">
                        <p>{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <InputSelect
                  value={styles[prop as keyof typeof styles].val}
                  unitValue={styles[prop as keyof typeof styles].unit}
                  onValueChange={(v) => handleStyleChange(prop, v, styles[prop as keyof typeof styles].unit)}
                  onUnitChange={(u) => handleStyleChange(prop, styles[prop as keyof typeof styles].val, u)}
                  placeholder="auto"
                />
              </div>
            ))}
          </div>
          
          <div className="pt-2.5 border-t border-muted/30">
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              Values like 100% or 50vh work. Leave blank to use "auto".
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
