'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pointer,
  Palette,
  Sliders,
  ChevronDown,
  ChevronRight,
  Plus,
  Square,
  SquareDashed,
  ArrowBigUp,
  ArrowBigDown,
  ArrowBigRight,
  ArrowBigLeft,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalSpaceAround,
  AlignEndHorizontal,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignHorizontalSpaceBetween,
  AlignHorizontalSpaceAround,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import IconHover from '../ReusableComponents/IconHover';
import InputSelect, { SelectSize } from '../ReusableComponents/SizeInput';
import SelectComp from '../ReusableComponents/SelectComp';

export default function RightSidebar() {
  const [bgOpen, setBgOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const [borderOpen, setBorderOpen] = useState(false);
  const [effectsOpen, setEffectsOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [boxShadow, setBoxShadow] = useState('none');

  // Spacing
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [spacingMargin, setSpacingMargin] = useState(false);
  const [spacingPadding, setSpacingPadding] = useState(false);
  const [margin, setMargin] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  const [padding, setPadding] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  const marginChanges = (value: string, position: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    if (spacingMargin) {
      setMargin((prev) => ({
        ...prev,
        [position]: value,
      }));
    } else {
      setMargin((prev) => ({
        ...prev,
        top: Number(value),
        right: Number(value),
        bottom: Number(value),
        left: Number(value),
      }));
    }
  };
  const paddingChanges = (value: string, position: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    if (spacingPadding) {
      setPadding((prev) => ({
        ...prev,
        [position]: value,
      }));
    } else {
      setPadding((prev) => ({
        ...prev,
        top: Number(value),
        right: Number(value),
        bottom: Number(value),
        left: Number(value),
      }));
    }
  };

  // Background
  const [bgOption, setBgOption] = useState('color');

  localStorage.setItem('margin', JSON.stringify(margin));
  localStorage.setItem('padding', JSON.stringify(padding));

  // Display
  const [displayOpen, setDisplayOpen] = useState(false);
  const [displayFlex, setDisplayFlex] = useState(false);
  const [display, setDisplay] = useState('none');

  const displayChanges = (value: string) => {
    setDisplay(value);
    setDisplayFlex(value === 'flex');
  };

  const boxShadowPresets = [
    { name: 'None', value: 'none' },
    { name: 'Small', value: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' },
    { name: 'Medium', value: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)' },
    { name: 'Large', value: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)' },
    { name: 'Extra Large', value: '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)' },
    { name: 'Inset', value: 'inset 0 2px 5px rgba(0,0,0,0.15)' },
  ];

  return (
    <div className="flex h-full flex-col bg-background overflow-auto">
      <Tabs defaultValue="styles" className="flex-1">
        <div className="border-b">
          <TabsList className="w-full justify-start px-2 pt-2 h-auto bg-transparent">
            <TabsTrigger value="styles" className="flex items-center gap-1.5 h-9">
              <Palette className="h-4 w-4" />
              <span>Styles</span>
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-1.5 h-9">
              <Sliders className="h-4 w-4" />
              <span>Properties</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Styles */}
        <TabsContent value="styles" className="p-0 m-0 h-full">
          <div className="p-4 space-y-3">
            {/* Spacing */}
            <Collapsible
              open={spacingOpen}
              onOpenChange={setSpacingOpen}
              className="rounded-lg border mt-4"
            >
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {spacingOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <span className="font-medium text-sm">Spacing</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs mb-1.5 block m-2">Margin</Label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSpacingMargin(false)}>
                            <IconHover icon={<Square className="h-4 w-4" />} iconName={'All'} />
                          </button>
                          <button onClick={() => setSpacingMargin(true)}>
                            <IconHover
                              icon={<SquareDashed className="h-4 w-4" />}
                              iconName={'Custom'}
                            />
                          </button>
                        </div>
                      </div>
                      {spacingMargin ? (
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
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="margin"
                            className="h-7 text-xs"
                            onChange={(e) => marginChanges(e.target.value, 'all')}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mt-1">
                        <Label className="text-xs mb-1.5 block m-2">Padding</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSpacingPadding(false)}>
                              <IconHover icon={<Square className="h-4 w-4" />} iconName={'All'} />
                            </button>
                            <button onClick={() => setSpacingPadding(true)}>
                              <IconHover
                                icon={<SquareDashed className="h-4 w-4" />}
                                iconName={'Custom'}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      {spacingPadding ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Top"
                            className="h-7 text-xs"
                            onChange={(e) => paddingChanges(e.target.value, 'top')}
                          />
                          <Input
                            placeholder="Right"
                            className="h-7 text-xs"
                            onChange={(e) => paddingChanges(e.target.value, 'right')}
                          />
                          <Input
                            placeholder="Bottom"
                            className="h-7 text-xs"
                            onChange={(e) => paddingChanges(e.target.value, 'bottom')}
                          />
                          <Input
                            placeholder="Left"
                            className="h-7 text-xs"
                            onChange={(e) => paddingChanges(e.target.value, 'left')}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="padding"
                            className="h-7 text-xs"
                            onChange={(e) => paddingChanges(e.target.value, 'all')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Display */}
            <Collapsible
              open={displayOpen}
              onOpenChange={setDisplayOpen}
              className="rounded-lg border"
            >
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
                    <Select defaultValue="none" onValueChange={(value) => displayChanges(value)}>
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
                  {displayFlex && (
                    <div className="space-y-2">
                      {/* Direction */}
                      <div>
                        <Label className="text-xs w-16">Direction</Label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<ArrowBigDown className="h-4 w-4" />}
                              iconName={'Row'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<ArrowBigUp className="h-4 w-4" />}
                              iconName={'Row-Reverse'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<ArrowBigRight className="h-4 w-4" />}
                              iconName={'Column'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<ArrowBigLeft className="h-4 w-4" />}
                              iconName={'Column-Reverse'}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Align */}
                      <div>
                        <Label className="text-xs w-16">Align</Label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignStartHorizontal className="h-4 w-4" />}
                              iconName={'Start'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignCenterHorizontal className="h-4 w-4" />}
                              iconName={'Center'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignEndHorizontal className="h-4 w-4" />}
                              iconName={'End'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignVerticalSpaceAround className="h-4 w-4" />}
                              iconName={'Stretch'}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Justify */}
                      <div>
                        <Label className="text-xs w-16">Justify</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalJustifyStart className="h-4 w-4" />}
                              iconName={'Start'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalJustifyCenter className="h-4 w-4" />}
                              iconName={'Center'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalJustifyEnd className="h-4 w-4" />}
                              iconName={'End'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalSpaceBetween className="h-4 w-4" />}
                              iconName={'Space Between'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
                              iconName={'Space Around'}
                            />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover
                              icon={<AlignHorizontalSpaceAround className="h-4 w-4" />}
                              iconName={'Space Evenly'}
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
                            defaultValue="px"
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

            {/* Background */}
            <Collapsible open={bgOpen} onOpenChange={setBgOpen} className="rounded-lg border">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {bgOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <span className="font-medium text-sm">Background</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Background Type</Label>
                      <Select defaultValue="color" onValueChange={(value) => setBgOption(value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="color">Color</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Background Color */}
                    {bgOption === 'color' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs flex-1" type="color" />
                        </div>
                      </div>
                    )}

                    {/* Gradient Options */}
                    {bgOption === 'gradient' && (
                      <SelectComp
                        label="Gradient Type"
                        defaultValue="linear"
                        options={[
                          { label: 'Linear', value: 'linear' },
                          { label: 'Radial', value: 'radial' },
                          { label: 'Conic', value: 'conic' },
                        ]}
                      />
                    )}

                    {/* Background Image */}
                    {bgOption === 'image' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Image</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs flex-1" placeholder="URL or select file" />
                          <Button variant="outline" className="h-8 text-xs">
                            Browse
                          </Button>
                        </div>
                        <SelectComp
                          label="Size"
                          defaultValue="cover"
                          options={[
                            { label: 'Cover', value: 'cover' },
                            { label: 'Contain', value: 'contain' },
                            { label: 'Auto', value: 'auto' },
                          ]}
                        />
                        <SelectComp
                          label="Position"
                          defaultValue="center"
                          options={[
                            { label: 'Center', value: 'center' },
                            { label: 'Top Left', value: 'top-left' },
                            { label: 'Top Right', value: 'top-right' },
                            { label: 'Bottom Left', value: 'bottom-left' },
                            { label: 'Bottom Right', value: 'bottom-right' },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Size */}
            <Collapsible open={sizeOpen} onOpenChange={setSizeOpen} className="rounded-lg border">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {sizeOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
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
                    <div>
                      <Label className="text-xs mb-1.5 block">Min Width</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input placeholder="8" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Max Width</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input placeholder="8" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Min Height</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input placeholder="8" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Max Height</Label>
                      <div className="flex gap-2">
                        <Input placeholder="8" />
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Font */}
            <Collapsible open={fontOpen} onOpenChange={setFontOpen} className="rounded-lg border">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {fontOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <span className="font-medium text-sm">Typography</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <div className="space-y-3">
                    <SelectComp
                      label="Font Family"
                      defaultValue="Arial"
                      options={[
                        { label: 'Arial', value: 'Arial' },
                        { label: 'Helvetica', value: 'Helvetica' },
                        { label: 'Times New Roman', value: 'Times New Roman' },
                        { label: 'Courier New', value: 'Courier New' },
                      ]}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Font Size</Label>
                      <InputSelect
                        defaultValue="px"
                        options={[
                          { label: 'px', value: 'px' },
                          { label: 'rem', value: 'rem' },
                          { label: '%', value: '%' },
                        ]}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Line Height</Label>
                      <InputSelect
                        defaultValue="px"
                        options={[
                          { label: 'px', value: 'px' },
                          { label: 'rem', value: 'rem' },
                          { label: '%', value: '%' },
                        ]}
                      />
                    </div>
                    <SelectComp
                      label="Font Weight"
                      defaultValue="400"
                      options={[
                        { label: 'Light (300)', value: '300' },
                        { label: 'Regular (400)', value: '400' },
                        { label: 'Medium (500)', value: '500' },
                        { label: 'Semibold (600)', value: '600' },
                        { label: 'Bold (700)', value: '700' },
                      ]}
                    />
                    <SelectComp
                      label="Font Style"
                      defaultValue="normal"
                      options={[
                        { label: 'Normal', value: 'normal' },
                        { label: 'Italic', value: 'italic' },
                      ]}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Letter Spacing</Label>
                      <InputSelect
                        defaultValue="px"
                        options={[
                          { label: 'px', value: 'px' },
                          { label: 'rem', value: 'rem' },
                        ]}
                      />
                    </div>
                    <SelectComp
                      label="Text Align"
                      defaultValue="left"
                      options={[
                        { label: 'Left', value: 'left' },
                        { label: 'Center', value: 'center' },
                        { label: 'Right', value: 'right' },
                        { label: 'Justify', value: 'justify' },
                      ]}
                    />
                    <SelectComp
                      label="Text Transform"
                      defaultValue="none"
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Capitalize', value: 'capitalize' },
                        { label: 'Uppercase', value: 'uppercase' },
                        { label: 'Lowercase', value: 'lowercase' },
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Text Decoration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                        None
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                        <span className="underline">Underline</span>
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                        <span className="line-through">Strikethrough</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Border */}
            <Collapsible
              open={borderOpen}
              onOpenChange={setBorderOpen}
              className="rounded-lg border"
            >
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {borderOpen ? (
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
                <div className="px-3 pb-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs w-16">Color</Label>
                      <Input className="h-8 text-xs flex-1" type="color" />
                    </div>
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
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Effects */}
            <Collapsible
              open={effectsOpen}
              onOpenChange={setEffectsOpen}
              className="rounded-lg border"
            >
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                      {effectsOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <span className="font-medium text-sm">Effects</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Box Shadow</Label>
                      <Select value={boxShadow} onValueChange={setBoxShadow}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {boxShadowPresets.map((preset) => (
                            <SelectItem key={preset.name} value={preset.value}>
                              {preset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <SelectComp
                      label="Text Shadow"
                      defaultValue="none"
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Small', value: 'small' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'Large', value: 'large' },
                      ]}
                    />
                    <SelectComp
                      label="Filter"
                      defaultValue="none"
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Blur', value: 'blur' },
                        { label: 'Brightness', value: 'brightness' },
                        { label: 'Contrast', value: 'contrast' },
                        { label: 'Grayscale', value: 'grayscale' },
                        { label: 'Hue Rotate', value: 'hue-rotate' },
                        { label: 'Invert', value: 'invert' },
                        { label: 'Saturate', value: 'saturate' },
                        { label: 'Sepia', value: 'sepia' },
                      ]}
                    />
                    <SelectComp
                      label="Backdrop Filter"
                      defaultValue="none"
                      options={[
                        { label: 'None', value: 'none' },
                        { label: 'Blur', value: 'blur' },
                        { label: 'Brightness', value: 'brightness' },
                        { label: 'Contrast', value: 'contrast' },
                        { label: 'Grayscale', value: 'grayscale' },
                        { label: 'Hue Rotate', value: 'hue-rotate' },
                        { label: 'Invert', value: 'invert' },
                        { label: 'Saturate', value: 'saturate' },
                        { label: 'Sepia', value: 'sepia' },
                      ]}
                    />
                    <SelectComp
                      label="Opacity"
                      defaultValue="100"
                      options={[
                        { label: '0%', value: '0' },
                        { label: '25%', value: '25' },
                        { label: '50%', value: '50' },
                        { label: '75%', value: '75' },
                        { label: '100%', value: '100' },
                      ]}
                    />
                    <SelectComp
                      label="Overflow"
                      defaultValue="visible"
                      options={[
                        { label: 'Visible', value: 'visible' },
                        { label: 'Hidden', value: 'hidden' },
                        { label: 'Scroll', value: 'scroll' },
                        { label: 'Auto', value: 'auto' },
                      ]}
                    />
                    <SelectComp
                      label="Mix Blend Mode"
                      defaultValue="normal"
                      options={[
                        { label: 'Normal', value: 'normal' },
                        { label: 'Multiply', value: 'multiply' },
                        { label: 'Screen', value: 'screen' },
                        { label: 'Overlay', value: 'overlay' },
                        { label: 'Darken', value: 'darken' },
                        { label: 'Lighten', value: 'lighten' },
                        { label: 'Color Dodge', value: 'color-dodge' },
                        { label: 'Color Burn', value: 'color-burn' },
                        { label: 'Difference', value: 'difference' },
                        { label: 'Exclusion', value: 'exclusion' },
                      ]}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Position */}
            <Collapsible
              open={positionOpen}
              onOpenChange={setPositionOpen}
              className="rounded-lg border"
            >
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
                <div className="px-3 pb-3">
                  <div className="space-y-3">
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
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        {/* Properties */}
        <TabsContent value="properties" className="h-full overflow-auto p-4">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Pointer className="h-4 w-4" />
                  Element Properties
                </h3>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Apply to All
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="element-id" className="text-xs">
                    Element ID
                  </Label>
                  <Input id="element-id" placeholder="Enter element ID" className="h-8 text-sm" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="element-class" className="text-xs">
                    CSS Classes
                  </Label>
                  <Input
                    id="element-class"
                    placeholder="Enter CSS classes"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="element-link" className="text-xs">
                    Link URL
                  </Label>
                  <Input
                    id="element-link"
                    placeholder="https://example.com"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="new-tab" className="h-4 w-4" />
                  <Label htmlFor="new-tab" className="text-xs">
                    Open in new tab
                  </Label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-3">Accessibility</h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="aria-label" className="text-xs">
                    ARIA Label
                  </Label>
                  <Input
                    id="aria-label"
                    placeholder="Describe element purpose"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="aria-role" className="text-xs">
                    ARIA Role
                  </Label>
                  <select
                    id="aria-role"
                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">None</option>
                    <option value="button">Button</option>
                    <option value="link">Link</option>
                    <option value="heading">Heading</option>
                    <option value="img">Image</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-3">Custom Attributes</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <Input placeholder="Name" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Input placeholder="Value" className="h-8 text-sm" />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Attribute
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-3">Events</h3>
              <div className="space-y-3">
                <SelectComp
                  label="On Click"
                  defaultValue="none"
                  options={[
                    { label: 'None', value: 'none' },
                    { label: 'Alert', value: 'alert' },
                    { label: 'Redirect', value: 'redirect' },
                  ]}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
