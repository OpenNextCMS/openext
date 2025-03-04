"use client"

import { useState } from "react"
import LeftSidebar from "./left-sidebar"
import RightSidebar from "./right-sidebar"
import Toolbar from "./toolbar"
import Canvas from "./canvas"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full">
        {/* Left Sidebar Toggle Button - Always Visible */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="absolute left-2 top-3.5 z-10 h-6 w-6 rounded-full border shadow-md"
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          >
            {showLeftSidebar ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
        </div>

        {/* Left Sidebar */}
        <div className={`transition-all duration-300 ${showLeftSidebar ? "w-64 border-r" : "w-0"}`}>
          <div className={`h-full ${!showLeftSidebar ? "invisible" : ""}`}>
            <LeftSidebar />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <Toolbar />
          <Canvas />
        </div>

        {/* Right Sidebar */}
        <div className={`transition-all duration-300 ${showRightSidebar ? "w-64 border-l" : "w-0"}`}>
          <div className={`h-full ${!showRightSidebar ? "invisible" : ""}`}>
            <RightSidebar />
          </div>
        </div>

        {/* Right Sidebar Toggle Button - Always Visible */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-2.5 z-10 h-6 w-6 rounded-full border shadow-md"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          >
            {showRightSidebar ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

