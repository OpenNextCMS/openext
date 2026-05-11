'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Square, SquareDashed, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';

type SpacingProps = {
  spacingOpen: boolean;
  setSpacingOpen: (value: boolean) => void;
};

export default function Spacing({ spacingOpen, setSpacingOpen }: SpacingProps) {
  const dispatch = useAppDispatch();
  const [spacingMargin, setSpacingMargin] = useState(false);
  const [spacingPadding, setSpacingPadding] = useState(false);
  const [margin, setMargin] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [padding, setPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);

  // Helper to construct CSS margin/padding string
  const getSpacingString = (values: { top: number; right: number; bottom: number; left: number }) => {
    return `${values.top}px ${values.right}px ${values.bottom}px ${values.left}px`;
  };

  const marginChanges = (value: string, position: keyof typeof margin | 'all') => {
    const numValue = Number(value) || 0;
    let newMargin;
    if (position === 'all') {
      newMargin = { top: numValue, right: numValue, bottom: numValue, left: numValue };
    } else {
      newMargin = { ...margin, [position]: numValue };
    }
    setMargin(newMargin);
    dispatch(updateSelectedBlockStyles({ margin: getSpacingString(newMargin) }));
  };

  const paddingChanges = (value: string, position: keyof typeof padding | 'all') => {
    const numValue = Number(value) || 0;
    let newPadding;
    if (position === 'all') {
      newPadding = { top: numValue, right: numValue, bottom: numValue, left: numValue };
    } else {
      newPadding = { ...padding, [position]: numValue };
    }
    setPadding(newPadding);
    dispatch(updateSelectedBlockStyles({ padding: getSpacingString(newPadding) }));
  };

  const handleRemoveMargin = () => {
    const zeroMargin = { top: 0, right: 0, bottom: 0, left: 0 };
    setMargin(zeroMargin);
    dispatch(updateSelectedBlockStyles({ margin: '0px' }));
  };

  const handleRemovePadding = () => {
    const zeroPadding = { top: 0, right: 0, bottom: 0, left: 0 };
    setPadding(zeroPadding);
    dispatch(updateSelectedBlockStyles({ padding: '0px' }));
  };

  // Sync from Redux when block changes
  useEffect(() => {
    if (selectedBlock?.style) {
      const p = selectedBlock.style.padding;
      const m = selectedBlock.style.margin;

      if (typeof p === 'string') {
        const parts = p.split(' ').map((val) => parseInt(val) || 0);
        if (parts.length === 4) setPadding({ top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] });
        else if (parts.length === 1) setPadding({ top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] });
      } else {
        setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
      }

      if (typeof m === 'string') {
        const parts = m.split(' ').map((val) => parseInt(val) || 0);
        if (parts.length === 4) setMargin({ top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] });
        else if (parts.length === 1) setMargin({ top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] });
      } else {
        setMargin({ top: 0, right: 0, bottom: 0, left: 0 });
      }
    }
  }, [selectedBlock]);

  return (
    <Collapsible
      open={spacingOpen}
      onOpenChange={setSpacingOpen}
      className="rounded-lg border mt-4"
    >
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {spacingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Spacing</span>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-4">
          {/* Margin */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold">Margin</Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveMargin} title="Remove Margin">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
                <div className="flex bg-muted rounded p-0.5">
                  <button onClick={() => setSpacingMargin(false)} className={`p-1 rounded ${!spacingMargin ? 'bg-background shadow-sm' : ''}`}>
                    <Square className="h-3 w-3" />
                  </button>
                  <button onClick={() => setSpacingMargin(true)} className={`p-1 rounded ${spacingMargin ? 'bg-background shadow-sm' : ''}`}>
                    <SquareDashed className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            {spacingMargin ? (
              <div className="grid grid-cols-2 gap-2">
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <div key={side} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase pl-1">{side}</span>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={margin[side as keyof typeof margin]}
                      onChange={(e) => marginChanges(e.target.value, side as keyof typeof margin)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Input
                type="number"
                placeholder="All margins"
                className="h-7 text-xs"
                value={margin.top}
                onChange={(e) => marginChanges(e.target.value, 'all')}
              />
            )}
          </div>

          {/* Padding */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold">Padding</Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemovePadding} title="Remove Padding">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
                <div className="flex bg-muted rounded p-0.5">
                  <button onClick={() => setSpacingPadding(false)} className={`p-1 rounded ${!spacingPadding ? 'bg-background shadow-sm' : ''}`}>
                    <Square className="h-3 w-3" />
                  </button>
                  <button onClick={() => setSpacingPadding(true)} className={`p-1 rounded ${spacingPadding ? 'bg-background shadow-sm' : ''}`}>
                    <SquareDashed className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            {spacingPadding ? (
              <div className="grid grid-cols-2 gap-2">
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <div key={side} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase pl-1">{side}</span>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={padding[side as keyof typeof padding]}
                      onChange={(e) => paddingChanges(e.target.value, side as keyof typeof padding)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Input
                type="number"
                placeholder="All paddings"
                className="h-7 text-xs"
                value={padding.top}
                onChange={(e) => paddingChanges(e.target.value, 'all')}
              />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
