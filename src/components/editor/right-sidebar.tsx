import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MessageSquareText, Palette, Sliders } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice';
import Spacing from './Right-Sidebar/Style/spacing';
import Display from './Right-Sidebar/Style/display';
import Background from './Right-Sidebar/Style/background';
import Size from './Right-Sidebar/Style/size';
import Typography from './Right-Sidebar/Style/typography';
import Border from './Right-Sidebar/Style/border';
import Hover from './Right-Sidebar/Style/hover';
import Effects from './Right-Sidebar/Style/effect';
import Position from './Right-Sidebar/Style/position';
import SubElementSelector from './Right-Sidebar/Style/SubElementSelector';
import ElementProperties from './Right-Sidebar/properties/element-properties';
import Accessibility from './Right-Sidebar/properties/accessibility';
import CustomAttributes from './Right-Sidebar/properties/custom-attributes';
import Events from './Right-Sidebar/properties/events';
import PromptPanel from './Right-Sidebar/prompt/prompt-panel';

export default function RightSidebar() {
  const dispatch = useAppDispatch();
  const [positionOpen, setPositionOpen] = useState(false);
  const [spacingOpen, setSpacingOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [displayFlex, setDisplayFlex] = useState(false);
  const selectedLabel = useAppSelector((state) => state.canvas.selectedLabel);

  const displayChanges = (value: string) => {
    setDisplayFlex(value === 'flex');
    dispatch(updateSelectedBlockStyles({ display: value }));
  };

  return (
    <div className="flex h-full flex-col bg-background overflow-auto">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
            Loading panel…
          </div>
        }
      >
        <Tabs defaultValue="styles" className="flex-1">
          <div className="border-b">
            <TabsList className="grid w-full grid-cols-3 px-2 pt-2 h-auto bg-transparent">
              <TabsTrigger value="styles" className="flex items-center gap-1.5 h-9 px-2">
                <Palette className="h-4 w-4" />
                <span>Styles</span>
              </TabsTrigger>
              <TabsTrigger value="properties" className="flex items-center gap-1.5 h-9 px-2">
                <Sliders className="h-4 w-4" />
                <span>Props</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-1.5 h-9 px-2">
                <MessageSquareText className="h-4 w-4" />
                <span>Prompt</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Styles */}
          <TabsContent value="styles" className="p-0 m-0 h-full">
            <div className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Block Label</label>
                <input
                  value={selectedLabel}
                  readOnly
                  className="w-full mt-1 border border-gray-300 rounded px-2 py-1 text-sm"
                />
              </div>

              <SubElementSelector />

              <Spacing spacingOpen={spacingOpen} setSpacingOpen={setSpacingOpen} />
              <Display
                displayOpen={displayOpen}
                setDisplayOpen={setDisplayOpen}
                displayFlex={displayFlex}
                displayChanges={displayChanges}
              />
              <Background />
              <Size />
              <Typography />
              <Border />
              <Hover />
              <Effects />
              <Position
                positionOpen={positionOpen}
                setPositionOpen={setPositionOpen}
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

          {/* Prompt */}
          <TabsContent value="prompt" className="h-full overflow-auto p-4">
            <PromptPanel />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}
