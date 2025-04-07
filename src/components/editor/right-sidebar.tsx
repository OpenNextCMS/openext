'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Palette,
  Sliders,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import Spacing from './Right-Sidebar/Style/spacing';
import Display from './Right-Sidebar/Style/display';
import Background from'./Right-Sidebar/Style/background';
import Size from './Right-Sidebar/Style/size';
import Typography from './Right-Sidebar/Style/typography';
import Border from './Right-Sidebar/Style/border';
import Effects from './Right-Sidebar/Style/effect';
import Position from './Right-Sidebar/Style/position';
import ElementProperties from './Right-Sidebar/properties/element-properties';
import Accessibility from './Right-Sidebar/properties/accessibility';
import CustomAttributes from './Right-Sidebar/properties/custom-attributes';
import Events from './Right-Sidebar/properties/events';

export default function RightSidebar() {
  const [positionOpen, setPositionOpen] = useState(false);


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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('margin', JSON.stringify(margin));
      localStorage.setItem('padding', JSON.stringify(padding));
    }
  }, [margin, padding]);
  // Display
  const [displayOpen, setDisplayOpen] = useState(false);
  const [displayFlex, setDisplayFlex] = useState(false);

  const displayChanges = (value: string) => {
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
            <Spacing spacingOpen={spacingOpen} setSpacingOpen={setSpacingOpen} />

            {/* Display */}
            <Display
              displayOpen={displayOpen}
              setDisplayOpen={setDisplayOpen}
              displayFlex={displayFlex}
              displayChanges={displayChanges}
            />

            {/* Background */}
            <Background />

            {/* Size */}
            < Size />

            {/* Typography */}
            <Typography />

            {/* Border */}
            <Border />

            {/* Effects */}
            <Effects />

            {/* Position */}
            <Position
              positionOpen={positionOpen}
              setPositionOpen={setPositionOpen}
              marginChanges={marginChanges}
            />
          </div>
        </TabsContent>

        {/* Properties */}
        <TabsContent value="properties" className="h-full overflow-auto p-4">
          <div className="space-y-4">
            
          <ElementProperties />

          <Accessibility />

          <CustomAttributes />

          <Events />
          
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
