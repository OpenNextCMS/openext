'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/redux/hooks';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronDown,
  ChevronRight,
  ArrowBigDown,
  ArrowBigUp,
  ArrowBigLeft,
  ArrowBigRight,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignVerticalSpaceAround,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
} from 'lucide-react';
import IconHover from '@/components/ReusableComponents/IconHover';
import InputSelect from '@/components/ReusableComponents/SizeInput';

// Define props
interface DisplayProps {
  displayOpen: boolean;
  setDisplayOpen: (val: boolean) => void;
  displayChanges: (value: string) => void;
  displayFlex: boolean;
}

const Display = ({ displayOpen, setDisplayOpen, displayChanges }: DisplayProps) => {
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const [displayValue, setDisplayValue] = useState('none');
  const [justifyContent, setJustifyContent] = useState('');

  useEffect(() => {
    const style = selectedBlock?.style;
    if (style) {
      if (typeof style.display === 'string') {
        setDisplayValue(style.display);
      }
      if (typeof style.justifyContent === 'string') {
        setJustifyContent(style.justifyContent);
      } else {
        setJustifyContent('');
      }
    }
  }, [selectedBlock]);

  const isFlex = displayValue === 'flex';

  return (
    <Collapsible open={displayOpen} onOpenChange={setDisplayOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {displayOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Display</span>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Label className="text-xs w-16">Display</Label>
            <Select
              value={displayValue}
              onValueChange={(val) => {
                setDisplayValue(val);
                displayChanges(val);
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">none</SelectItem>
                <SelectItem value="block">block</SelectItem>
                <SelectItem value="inline">inline</SelectItem>
                <SelectItem value="inline-block">inline-block</SelectItem>
                <SelectItem value="flex">flex</SelectItem>
                <SelectItem value="grid">grid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isFlex && (
            <div className="space-y-2">
              {/* Direction */}
              <div>
                <Label className="text-xs w-16">Direction</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover icon={<ArrowBigDown className="h-4 w-4" />} iconName="Row" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover icon={<ArrowBigUp className="h-4 w-4" />} iconName="Row-Reverse" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover icon={<ArrowBigRight className="h-4 w-4" />} iconName="Column" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover
                      icon={<ArrowBigLeft className="h-4 w-4" />}
                      iconName="Column-Reverse"
                    />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs w-16">Align</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover
                      icon={<AlignStartHorizontal className="h-4 w-4" />}
                      iconName="Start"
                    />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover
                      icon={<AlignCenterHorizontal className="h-4 w-4" />}
                      iconName="Center"
                    />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover icon={<AlignEndHorizontal className="h-4 w-4" />} iconName="End" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <IconHover
                      icon={<AlignVerticalSpaceAround className="h-4 w-4" />}
                      iconName="Stretch"
                    />
                  </Button>
                </div>
              </div>

              {/* Justify */}
              <div>
                <Label className="text-xs w-16">Justify</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={justifyContent === 'flex-start' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalJustifyStart className="h-4 w-4" />}
                      iconName="Start"
                    />
                  </Button>
                  <Button
                    variant={justifyContent === 'center' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalJustifyCenter className="h-4 w-4" />}
                      iconName="Center"
                    />
                  </Button>
                  <Button
                    variant={justifyContent === 'flex-end' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalJustifyEnd className="h-4 w-4" />}
                      iconName="End"
                    />
                  </Button>
                  <Button
                    variant={justifyContent === 'space-between' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalSpaceBetween className="h-4 w-4" />}
                      iconName="Space Between"
                    />
                  </Button>
                  <Button
                    variant={justifyContent === 'space-around' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
                      iconName="Space Around"
                    />
                  </Button>
                  <Button
                    variant={justifyContent === 'space-evenly' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                  >
                    <IconHover
                      icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
                      iconName="Space Evenly"
                    />
                  </Button>
                </div>
              </div>

              {/* Wrap */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Wrap</Label>
                <Select defaultValue="nowrap">
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nowrap">no-wrap</SelectItem>
                    <SelectItem value="wrap">wrap</SelectItem>
                    <SelectItem value="wrap-reverse">wrap-reverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gap */}
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Gap</Label>
                <div className="flex gap-2 flex-1">
                  <InputSelect
                    placeholder="8"
                    unitValue="px"
                    options={[
                      { label: 'px', value: 'px' },
                      { label: 'rem', value: 'rem' },
                      { label: '%', value: '%' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Display;
