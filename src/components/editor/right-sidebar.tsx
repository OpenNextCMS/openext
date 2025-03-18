"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pointer, Palette, Sliders } from "lucide-react"

export default function RightSidebar() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Properties</h2>
      </div>

      <Tabs defaultValue="styles" className="h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="styles" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Styles</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <span>Properties</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="styles" className="h-full overflow-auto p-4">
          <div className="rounded-lg border p-4 bg-muted/20">
            <h3 className="text-sm font-medium mb-2">Selection</h3>
            <p className="text-sm text-muted-foreground">Select an element to edit its styles</p>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="h-full overflow-auto p-4">
          <div className="rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">Selection</h3>
              <Pointer className="h-4 w-4" />
            </div>

            <p className="text-sm text-muted-foreground mb-4">You don&apos;t have any selected element.</p>

            <ul className="list-disc pl-5 text-sm space-y-2 text-muted-foreground">
              <li>Select an element from the canvas.</li>
              <li>Pick any style from the Style Catalog.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
