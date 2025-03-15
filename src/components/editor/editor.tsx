"use client"

import { useState } from "react"
import { DndContext } from "@dnd-kit/core";
import LeftSidebar from "./left-sidebar"
import RightSidebar from "./right-sidebar"
import Toolbar from "./toolbar"
import Block from "./blocks"
import Canvas from "./canvas"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [isOpen, setIsOpen] = useState(false);
  const [canvasBlocks, setCanvasBlocks] = useState([]);
  const toggleSidebar = () => setIsOpen(!isOpen);


  const handleDragEnd = (event) => {
    console.log(event)
    const { active, over } = event;

    if (!over) return;

    // Generate a unique block instance
    const blockData = {
      ...active.data.current,
      uniqueId: uuidv4(), // Ensure uniqueness
    };

    // Drop on canvas
    if (over.id === "canvas") {
      setCanvasBlocks((prev) => [...prev, blockData]);
      return;
    }

    // Drop in a column
    if (over.data.current?.type === "column") {
      const { blockId, columnIndex } = over.data.current;

      setCanvasBlocks((prev) =>
        prev.map((block) => {
          if (block.id === blockId) {
            const updatedChildren = [...block.children];
            updatedChildren[columnIndex] = [
              ...updatedChildren[columnIndex],
              blockData,
            ];
            return { ...block, children: updatedChildren };
          }
          return block;
        })
      );
    }
  };


  return (
    <div className="flex h-full flex-col">
      <DndContext onDragEnd={handleDragEnd}>
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
          {/* Block Sidebar */}
          <div>
            <Button
              onClick={toggleSidebar}
              className="p-2 m-4 bg-blue-500 text-white rounded-lg"
            >
              {isOpen ? "Close Sidebar" : "Open Sidebar"}
            </Button>
            {isOpen && <Block />}
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col">
            <Toolbar />
            <Canvas canvasBlocks={canvasBlocks} />
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
      </DndContext>
    </div>
  )
}

