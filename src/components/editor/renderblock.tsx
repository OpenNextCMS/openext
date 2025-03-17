"use client"
import { useDroppable } from "@dnd-kit/core"

const RenderBlock = ({ block }) => {
    if (block.type === "column") {
        return (
            <div className="flex gap-4 border border-border p-2 mb-4 rounded-md transition-colors duration-300">
                {block.children.map((childBlocks, index) => (
                    <ColumnDropZone key={`${block.uniqueId}-col-${index}`} columnIndex={index} block={block}>
                        {childBlocks.length > 0 ? (
                            childBlocks.map((child) => <RenderBlock key={child.uniqueId} block={child} />)
                        ) : (
                            <p className="text-muted-foreground">Drop here</p>
                        )}
                    </ColumnDropZone>
                ))}
            </div>
        )
    }

    if (block.type === "text") {
        return <p className="p-2 border border-border mb-2 rounded-md transition-colors duration-300">{block.content}</p>
    }

    return null // Unknown block
}

// Handles drop inside a column
const ColumnDropZone = ({ children, block, columnIndex }) => {
    const { setNodeRef } = useDroppable({
        id: `${block.uniqueId}-column-${columnIndex}`, // Ensure unique column IDs
        data: { type: "column", blockId: block.uniqueId, columnIndex },
    })

    return (
        <div
            ref={setNodeRef}
            className="flex-1 border border-border p-2 min-h-[100px] bg-muted/30 dark:bg-muted/10 rounded-md transition-colors duration-300"
        >
            {children}
        </div>
    )
}

export default RenderBlock

