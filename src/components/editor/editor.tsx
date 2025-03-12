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
            className={`absolute ${showLeftSidebar ? "left-64 rounded-r-full" : "left-2 rounded-full"}  top-3.5 z-10 h-8 w-8  border shadow-md transition-all duration-300`}
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          >
            {showLeftSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
            className={`absolute ${showRightSidebar ? "right-64 rounded-l-full" : "right-2 rounded-full"} top-2.5 z-10 h-8 w-8 border shadow-md`}
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          >
            {showRightSidebar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

