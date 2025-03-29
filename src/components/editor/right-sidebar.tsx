'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pointer, Palette, Sliders, ChevronDown, ChevronRight, Link, Plus, Square, SquareDashed, ArrowBigUp, ArrowBigDown, ArrowBigRight, ArrowBigLeft, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalSpaceAround, AlignEndHorizontal, AlignStartHorizontal, AlignCenterHorizontal, AlignHorizontalSpaceBetween, AlignHorizontalSpaceAround } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import IconHover from '../ReusableComponents/IconHover';


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
    }
    else {
      setMargin((prev) => ({
        ...prev,
        top: Number(value),
        right: Number(value),
        bottom: Number(value),
        left: Number(value),
      }));
    }
  }
  const paddingChanges = (value: string, position: 'top' | 'right' | 'bottom' | 'left' | 'all') => {
    if (spacingPadding) {
      setPadding((prev) => ({
        ...prev,
        [position]: value,
      }));
    }
    else {
      setPadding((prev) => ({
        ...prev,
        top: Number(value),
        right: Number(value),
        bottom: Number(value),
        left: Number(value),
      }));
    }
  }

  // Background
  const [bgOption, setBgOption] = useState('color');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('margin', JSON.stringify(margin));
      localStorage.setItem('padding', JSON.stringify(padding));
    }
  }, [margin, padding]);
  // Display
  const [displayOpen, setDisplayOpen] = useState(false);
  const [displayFlex, setDisplayFlex] = useState(false);
  const [display, setDisplay] = useState('none');

  const displayChanges = (value: string) => {
    setDisplay(value);
    setDisplayFlex(value === 'flex');
  }

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
                      <div className='flex items-center justify-between'>
                        <Label className="text-xs mb-1.5 block m-2">Margin</Label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSpacingMargin(false)}>
                            <IconHover icon={<Square className="h-4 w-4" />} iconName={'All'} />
                          </button>
                          <button onClick={() => setSpacingMargin(true)}>
                            <IconHover icon={<SquareDashed className="h-4 w-4" />} iconName={'Custom'} />
                          </button>
                        </div>
                      </div>
                      {spacingMargin ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Top" className="h-7 text-xs" onChange={(e) => marginChanges(e.target.value, 'top')} />
                          <Input placeholder="Right" className="h-7 text-xs" onChange={(e) => marginChanges(e.target.value, 'right')} />
                          <Input placeholder="Bottom" className="h-7 text-xs" onChange={(e) => marginChanges(e.target.value, 'bottom')} />
                          <Input placeholder="Left" className="h-7 text-xs" onChange={(e) => marginChanges(e.target.value, 'left')} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="margin" className="h-7 text-xs" onChange={(e) => marginChanges(e.target.value, 'all')} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className='flex items-center justify-between mt-1'>
                        <Label className="text-xs mb-1.5 block m-2">Padding</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSpacingPadding(false)}>
                              <IconHover icon={<Square className="h-4 w-4" />} iconName={'All'} />
                            </button>
                            <button onClick={() => setSpacingPadding(true)}>
                              <IconHover icon={<SquareDashed className="h-4 w-4" />} iconName={'Custom'} />
                            </button>
                          </div>
                        </div>
                      </div>
                      {spacingPadding ? (
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Top" className="h-7 text-xs" onChange={(e) => paddingChanges(e.target.value, 'top')} />
                          <Input placeholder="Right" className="h-7 text-xs" onChange={(e) => paddingChanges(e.target.value, 'right')} />
                          <Input placeholder="Bottom" className="h-7 text-xs" onChange={(e) => paddingChanges(e.target.value, 'bottom')} />
                          <Input placeholder="Left" className="h-7 text-xs" onChange={(e) => paddingChanges(e.target.value, 'left')} />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="padding" className="h-7 text-xs" onChange={(e) => paddingChanges(e.target.value, 'all')} />
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
                        <div className='flex gap-2'>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<ArrowBigDown className="h-4 w-4" />} iconName={'Row'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<ArrowBigUp className="h-4 w-4" />} iconName={'Row-Reverse'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<ArrowBigRight className="h-4 w-4" />} iconName={'Column'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<ArrowBigLeft className="h-4 w-4" />} iconName={'Column-Reverse'} />
                          </Button>
                        </div>
                      </div>

                      {/* Align */}
                      <div>
                        <Label className="text-xs w-16">Align</Label>
                        <div className='flex gap-2'>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignStartHorizontal className="h-4 w-4" />} iconName={'Start'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignCenterHorizontal className="h-4 w-4" />} iconName={'Center'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignEndHorizontal className="h-4 w-4" />} iconName={'End'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignVerticalSpaceAround className="h-4 w-4" />} iconName={'Stretch'} />
                          </Button>
                        </div>
                      </div>

                      {/* Justify */}
                      <div>
                        <Label className="text-xs w-16">Justify</Label>
                        <div className='grid grid-cols-3 gap-2'>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalJustifyStart className="h-4 w-4" />} iconName={'Start'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalJustifyCenter className="h-4 w-4" />} iconName={'Center'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalJustifyEnd className="h-4 w-4" />} iconName={'End'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalSpaceBetween className="h-4 w-4" />} iconName={'Space Between'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalSpaceAround className="h-4 w-4" />} iconName={'Space Around'} />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            <IconHover icon={<AlignHorizontalSpaceAround className="h-4 w-4" />} iconName={'Space Evenly'} />
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
                          <Input className="h-8 text-xs" placeholder="8" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Background */}
            <Collapsible
              open={bgOpen}
              onOpenChange={setBgOpen}
              className="rounded-lg border"
            >
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
                          <div className="w-7 h-7 rounded-md border bg-primary"></div>
                          <Input className="h-8 text-xs flex-1" value="#0070f3" />
                        </div>
                      </div>
                    )}

                    {/* Gradient Options */}
                    {bgOption === 'gradient' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Gradient Type</Label>
                        <Select defaultValue="linear">
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="radial">Radial</SelectItem>
                            <SelectItem value="conic">Conic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Background Image */}
                    {bgOption === 'image' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Image</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs flex-1" placeholder="URL or select file" />
                          <Button variant="outline" className="h-8 text-xs">Browse</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs mb-1.5 block">Size</Label>
                            <Select defaultValue="cover">
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cover">cover</SelectItem>
                                <SelectItem value="contain">contain</SelectItem>
                                <SelectItem value="auto">auto</SelectItem>
                                <SelectItem value="100%">100%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs mb-1.5 block">Position</Label>
                            <Select defaultValue="center">
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="center">center</SelectItem>
                                <SelectItem value="top">top</SelectItem>
                                <SelectItem value="right">right</SelectItem>
                                <SelectItem value="bottom">bottom</SelectItem>
                                <SelectItem value="left">left</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Size */}
            <Collapsible
              open={sizeOpen}
              onOpenChange={setSizeOpen}
              className="rounded-lg border"
            >
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
                  <span className="font-medium text-sm">Size</span>
                </div>
              </div>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="col-span-2">
                      <Label className="text-xs mb-1.5 block">Width</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1.5 block">Height</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">Min Width</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Max Width</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Min Height</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Max Height</Label>
                      <div className="flex gap-2 border border-border rounded-md">
                        <Input className="h-8 text-xs border-none" />
                        <Select defaultValue="px">
                          <SelectTrigger className="h-8 text-xs w-16 border-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="vw">vw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Font */}
            <Collapsible
              open={fontOpen}
              onOpenChange={setFontOpen}
              className="rounded-lg border"
            >
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
                    <div className="space-y-1.5">
                      <Label className="text-xs">Font Family</Label>
                      <Select defaultValue="system-ui">
                        <SelectTrigger className="h-8 text-xs w-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system-ui">System UI</SelectItem>
                          <SelectItem value="sans-serif">Sans Serif</SelectItem>
                          <SelectItem value="serif">Serif</SelectItem>
                          <SelectItem value="monospace">Monospace</SelectItem>
                          <SelectItem value="cursive">Cursive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Font Size</Label>
                        <div className="flex gap-2 border border-border rounded-md">
                          <Input className="h-8 text-xs border-none" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                              <SelectItem value="vw">em</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Line Height</Label>
                        <div className="flex gap-2 border border-border rounded-md">
                          <Input className="h-8 text-xs border-none" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                              <SelectItem value="vw">em</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Font Weight</Label>
                        <div className="flex gap-2 border border-border rounded-md">
                          <Select defaultValue="400">
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">Light (300)</SelectItem>
                              <SelectItem value="400">Regular (400)</SelectItem>
                              <SelectItem value="500">Medium (500)</SelectItem>
                              <SelectItem value="600">Semibold (600)</SelectItem>
                              <SelectItem value="700">Bold (700)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Letter Spacing</Label>
                        <div className="flex gap-2 border border-border rounded-md">
                          <Input className="h-8 text-xs border-none w-8" value={0} />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="em">em</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Text Align</Label>
                        <Select defaultValue="left">
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                            <SelectItem value="justify">Justify</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Text Transform</Label>
                        <Select defaultValue="none">
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="capitalize">Capitalize</SelectItem>
                            <SelectItem value="uppercase">Uppercase</SelectItem>
                            <SelectItem value="lowercase">Lowercase</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Text Decoration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1">None</Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                          <span className="underline">Underline</span>
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1">
                          <span className="line-through">Strikethrough</span>
                        </Button>
                      </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs mb-1.5 block">Color</Label>
                        <Input className="h-8 text-xs flex-1" type='color' />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Width</Label>
                        <div className="flex gap-2 border border-border rounded-md">
                          <Input className="h-8 text-xs border-none" value="1" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-16 border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Style</Label>
                      <Select defaultValue="solid">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="dashed">Dashed</SelectItem>
                          <SelectItem value="dotted">Dotted</SelectItem>
                          <SelectItem value="double">Double</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Border Radius</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            aria-label="Link values"
                          >
                            <Link className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
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
                          {boxShadowPresets.map(preset => (
                            <SelectItem key={preset.name} value={preset.value}>{preset.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Filter</Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="blur">Blur</SelectItem>
                          <SelectItem value="brightness">Brightness</SelectItem>
                          <SelectItem value="contrast">Contrast</SelectItem>
                          <SelectItem value="grayscale">Grayscale</SelectItem>
                          <SelectItem value="hue-rotate">Hue Rotate</SelectItem>
                          <SelectItem value="invert">Invert</SelectItem>
                          <SelectItem value="saturate">Saturate</SelectItem>
                          <SelectItem value="sepia">Sepia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Backdrop Filter</Label>
                      <Select defaultValue="none">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="blur">Blur</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Mix Blend Mode</Label>
                      <Select defaultValue="normal">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="multiply">Multiply</SelectItem>
                          <SelectItem value="screen">Screen</SelectItem>
                          <SelectItem value="overlay">Overlay</SelectItem>
                          <SelectItem value="darken">Darken</SelectItem>
                          <SelectItem value="lighten">Lighten</SelectItem>
                          <SelectItem value="color-dodge">Color Dodge</SelectItem>
                          <SelectItem value="color-burn">Color Burn</SelectItem>
                          <SelectItem value="difference">Difference</SelectItem>
                          <SelectItem value="exclusion">Exclusion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs">Position Type</Label>
                      <Select defaultValue="static">
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="static">Static</SelectItem>
                          <SelectItem value="relative">Relative</SelectItem>
                          <SelectItem value="absolute">Absolute</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="sticky">Sticky</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Top</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs" placeholder="Auto" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Right</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs" placeholder="Auto" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Bottom</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs" placeholder="Auto" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Left</Label>
                        <div className="flex gap-2">
                          <Input className="h-8 text-xs" placeholder="Auto" />
                          <Select defaultValue="px">
                            <SelectTrigger className="h-8 text-xs w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="px">px</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                              <SelectItem value="rem">rem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
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
                  <Label htmlFor="element-id" className="text-xs">Element ID</Label>
                  <Input id="element-id" placeholder="Enter element ID" className="h-8 text-sm" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="element-class" className="text-xs">CSS Classes</Label>
                  <Input id="element-class" placeholder="Enter CSS classes" className="h-8 text-sm" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="element-link" className="text-xs">Link URL</Label>
                  <Input id="element-link" placeholder="https://example.com" className="h-8 text-sm" />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="new-tab" className="h-4 w-4" />
                  <Label htmlFor="new-tab" className="text-xs">Open in new tab</Label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-medium mb-3">Accessibility</h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="aria-label" className="text-xs">ARIA Label</Label>
                  <Input id="aria-label" placeholder="Describe element purpose" className="h-8 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="aria-role" className="text-xs">ARIA Role</Label>
                  <select id="aria-role" className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm">
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
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">On Click</Label>
                  <Select defaultValue="none">
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="link">Navigate to URL</SelectItem>
                      <SelectItem value="modal">Open Modal</SelectItem>
                      <SelectItem value="submit">Submit Form</SelectItem>
                      <SelectItem value="custom">Custom JavaScript</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
