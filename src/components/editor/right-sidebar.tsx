"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pointer } from "lucide-react"

export default function RightSidebar() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="styles" className="h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="styles">Styles</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
        </TabsList>
        <TabsContent value="styles" className="h-full overflow-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium">Selection</h3>
          </div>
        </TabsContent>
        <TabsContent value="properties" className="h-full overflow-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">Selection</h3>
              <Pointer className="h-4 w-4" />
            </div>

            <p className="text-sm text-muted-foreground mb-4">You don&apos;t have any selected element.</p>

            <ul className="list-disc pl-5 text-sm space-y-2">
              <li>Select an element from the canvas.</li>
              <li>Pick any style from the Style Catalog.</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

