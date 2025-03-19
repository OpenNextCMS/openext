"use client"

import { useState, useEffect } from "react"
import { DndContext } from "@dnd-kit/core"
import LeftSidebar from "./left-sidebar"
import RightSidebar from "./right-sidebar"
import Block from "./blocks"
import Canvas from "./canvas"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import Toolbar from "./toolbar"
import StatusBar from "./status-bar"

export default function Editor() {
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [canvasBlocks, setCanvasBlocks] = useState([])
  const [viewMode, setViewMode] = useState("desktop")

  // Prevent body scrolling when layout changes
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
    setShowLeftSidebar(false)
  }

  const handleViewChange = (mode) => {
    setViewMode(mode)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!over) return

    // Extract block data
    const blockData = {
      ...active.data.current,
      uniqueId: uuidv4(), // Generate a unique ID for rendering
    }

    setCanvasBlocks((prev) => {
      // Dropped directly onto the canvas
      if (over.id === "canvas") {
        return [...prev, blockData]
      }

      // Dropped inside a column
      if (over.data.current?.type === "column") {
        return prev.map((block) =>
          updateNestedBlock(block, over.data.current.blockId, over.data.current.columnIndex, blockData),
        )
      }

      return prev
    })
  }

  // Recursive function to update nested blocks correctly
  const updateNestedBlock = (block, targetBlockId, columnIndex, newBlock) => {
    if (block.uniqueId === targetBlockId) {
      // Found the column block, update children
      const updatedChildren = [...block.children]
      updatedChildren[columnIndex] = [...updatedChildren[columnIndex], newBlock]

      return { ...block, children: updatedChildren }
    }

    // Recursively update children for deep nesting
    if (block.children) {
      return {
        ...block,
        children: block.children.map((col) =>
          col.map((child) => updateNestedBlock(child, targetBlockId, columnIndex, newBlock)),
        ),
      }
    }

    return block
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-full overflow-hidden">
          {/* Left Sidebar Toggle Button - Always Visible */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`absolute ${showLeftSidebar ? "left-64 rounded-r-full" : "left-2 rounded-full"}  top-3.5 z-10 h-8 w-8 border shadow-md transition-all duration-300 dark:border-border dark:bg-background`}
              onClick={() => {
                setShowLeftSidebar(!showLeftSidebar)
                setIsOpen(false)
              }}
            >
              {showLeftSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Left Sidebar */}
          <div className={`transition-all duration-300 ${showLeftSidebar ? "w-64 border-r border-border" : "w-0"}`}>
            <div className={`h-full ${!showLeftSidebar ? "invisible" : ""}`}>
              <LeftSidebar />
            </div>
          </div>

          {/* Block Sidebar */}
          {isOpen && <Block toggleSidebar={toggleSidebar} />}

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <Toolbar toggleSidebar={toggleSidebar} onViewChange={handleViewChange} />
            <Canvas canvasBlocks={canvasBlocks} viewMode={viewMode} />
          </div>

          {/* Right Sidebar */}
          <div className={`transition-all duration-300 ${showRightSidebar ? "w-64 border-l border-border" : "w-0"}`}>
            <div className={`h-full ${!showRightSidebar ? "invisible" : ""}`}>
              <RightSidebar />
            </div>
          </div>

          {/* Right Sidebar Toggle Button - Always Visible */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className={`absolute ${showRightSidebar ? "right-64 rounded-l-full" : "right-2 rounded-full"} top-2.5 z-10 h-8 w-8 border shadow-md transition-all duration-300 dark:border-border dark:bg-background`}
              onClick={() => setShowRightSidebar(!showRightSidebar)}
            >
              {showRightSidebar ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <StatusBar />
      </DndContext>
    </div>
  )
}
