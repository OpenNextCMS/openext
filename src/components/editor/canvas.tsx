"use client"
import { useDroppable } from "@dnd-kit/core"
import RenderBlock from "./renderblock"

export default function Canvas({ canvasBlocks, viewMode }) {
  const { setNodeRef } = useDroppable({ id: "canvas" })

  const getWidthClass = () => {
    switch (viewMode) {
      case "tablet":
        return "max-w-[768px]"; // Tablet width
      case "mobile":
        return "max-w-[480px]"; // Mobile landscape width
      default:
        return "max-w-full"; // Desktop width
    }
  }
  return (
    <div
      className="flex-1 bg-muted/40 dark:bg-muted/10 overflow-auto p-4 transition-colors duration-300"
      ref={setNodeRef}
    >
      <h2 className="text-xl font-semibold mb-4">Canvas</h2>
      <div
        className={`bg-background dark:bg-background w-full h-[800px] shadow-md p-4 rounded-lg border border-border transition-colors duration-300 mx-auto ${getWidthClass()}`}
      >
        {canvasBlocks.map((block) => (
          <RenderBlock key={block.uniqueId} block={block} />
        ))}
        {canvasBlocks.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Drag and drop blocks here to build your page</p>
          </div>
        )}
      </div>
    </div>
  )
}
