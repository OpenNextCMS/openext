'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Square, SquareDashed } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import IconHover from '@/components/ReusableComponents/IconHover';

type SpacingProps = {
  spacingOpen: boolean;
  setSpacingOpen: (value: boolean) => void;
};

export default function Spacing({ spacingOpen, setSpacingOpen }: SpacingProps) {
  const [spacingMargin, setSpacingMargin] = useState(false);
  const [spacingPadding, setSpacingPadding] = useState(false);
  const [margin, setMargin] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [padding, setPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  const marginChanges = (value: string, position: keyof typeof margin | 'all') => {
    if (spacingMargin) {
      setMargin((prev) => ({ ...prev, [position]: Number(value) }));
    } else {
      setMargin({ top: Number(value), right: Number(value), bottom: Number(value), left: Number(value) });
    }
  };

  const paddingChanges = (value: string, position: keyof typeof padding | 'all') => {
    if (spacingPadding) {
      setPadding((prev) => ({ ...prev, [position]: Number(value) }));
    } else {
      setPadding({ top: Number(value), right: Number(value), bottom: Number(value), left: Number(value) });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('margin', JSON.stringify(margin));
      localStorage.setItem('padding', JSON.stringify(padding));
    }
  }, [margin, padding]);

  return (
    <Collapsible open={spacingOpen} onOpenChange={setSpacingOpen} className="rounded-lg border mt-4">
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
        <div className="px-3 pb-3 space-y-3">
          {/* Margin */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs mb-1.5 block m-2">Margin</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setSpacingMargin(false)}>
                  <IconHover icon={<Square className="h-4 w-4" />} iconName="All" />
                </button>
                <button onClick={() => setSpacingMargin(true)}>
                  <IconHover icon={<SquareDashed className="h-4 w-4" />} iconName="Custom" />
                </button>
              </div>
            </div>
            {spacingMargin ? (
              <div className="grid grid-cols-2 gap-2">
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <Input
                    key={side}
                    placeholder={side.charAt(0).toUpperCase() + side.slice(1)}
                    className="h-7 text-xs"
                    onChange={(e) => marginChanges(e.target.value, side as keyof typeof margin)}
                  />
                ))}
              </div>
            ) : (
              <Input
                placeholder="margin"
                className="h-7 text-xs"
                onChange={(e) => marginChanges(e.target.value, 'all')}
              />
            )}
          </div>

          {/* Padding */}
          <div>
            <div className="flex items-center justify-between mt-1">
              <Label className="text-xs mb-1.5 block m-2">Padding</Label>
              <div className="flex items-center gap-2">
                <button onClick={() => setSpacingPadding(false)}>
                  <IconHover icon={<Square className="h-4 w-4" />} iconName="All" />
                </button>
                <button onClick={() => setSpacingPadding(true)}>
                  <IconHover icon={<SquareDashed className="h-4 w-4" />} iconName="Custom" />
                </button>
              </div>
            </div>
            {spacingPadding ? (
              <div className="grid grid-cols-2 gap-2">
                {['top', 'right', 'bottom', 'left'].map((side) => (
                  <Input
                    key={side}
                    placeholder={side.charAt(0).toUpperCase() + side.slice(1)}
                    className="h-7 text-xs"
                    onChange={(e) => paddingChanges(e.target.value, side as keyof typeof padding)}
                  />
                ))}
              </div>
            ) : (
              <Input
                placeholder="padding"
                className="h-7 text-xs"
                onChange={(e) => paddingChanges(e.target.value, 'all')}
              />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
