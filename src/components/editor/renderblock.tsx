"use client"
import { useDroppable } from "@dnd-kit/core"
import { GripVertical, Type, Columns, MousePointerClick } from "lucide-react"
import { useState } from "react"

const RenderBlock = ({ block }) => {
    const [isHovered, setIsHovered] = useState(false)

    if (block.type === "column") {
        return (
            <div
                className="relative group mb-6"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="absolute -top-3 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Columns className="h-3 w-3 mr-1" />
                    <span>Column Layout</span>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded hover:bg-primary/90 transition-colors">
                        Edit
                    </button>
                    <button className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded hover:bg-destructive/90 transition-colors">
                        Remove
                    </button>
                </div>
                <div className="flex gap-4 border p-4 rounded-lg shadow-sm group-hover:shadow-md transition-all group-hover:border-primary">
                    {block.children.map((childBlocks, index) => (
                        <ColumnDropZone key={`${block.uniqueId}-col-${index}`} columnIndex={index} block={block}>
                            {childBlocks.length > 0 ? (
                                childBlocks.map((child) => <RenderBlock key={child.uniqueId} block={child} />)
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                                    <GripVertical className="h-5 w-5 mb-2" />
                                    <p className="text-sm">Drop blocks here</p>
                                </div>
                            )}
                        </ColumnDropZone>
                    ))}
                </div>
            </div>
        )
    }

    if (block.type === "text") {
        return (
            <div
                className="relative group mb-4"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="absolute -top-3 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Type className="h-3 w-3 mr-1" />
                    <span>Text Block</span>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded hover:bg-primary/90 transition-colors">
                        Edit
                    </button>
                    <button className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded hover:bg-destructive/90 transition-colors">
                        Remove
                    </button>
                </div>
                <div className="p-4 border rounded-lg shadow-sm group-hover:shadow-md transition-all group-hover:border-primary">
                    {block.content}
                </div>
            </div>
        )
    }

    return null // Unknown block
}

// Handles drop inside a column
const ColumnDropZone = ({ children, block, columnIndex }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `${block.uniqueId}-column-${columnIndex}`, // Ensure unique column IDs
        data: { type: "column", blockId: block.uniqueId, columnIndex },
    })

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 border rounded-md p-3 min-h-[150px] transition-colors ${isOver ? "bg-primary/10 border-primary border-dashed" : "bg-muted/20 hover:bg-muted/30 border-border"
                }`}
        >
            {isOver && children.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full animate-pulse">
                    <MousePointerClick className="h-5 w-5 text-primary mb-2" />
                    <p className="text-sm text-primary">Drop here</p>
                </div>
            ) : (
                children
            )}
        </div>
    )
}

export default RenderBlock
