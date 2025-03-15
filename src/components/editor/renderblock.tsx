"use client";
import { useDroppable } from "@dnd-kit/core";

const RenderBlock = ({ block }) => {
    if (block.type === "column") {
        return (
            <div className="flex gap-4 border p-2 mb-4">
                {block.children.map((childBlocks, index) => (
                    <ColumnDropZone key={index} columnIndex={index} block={block}>
                        {childBlocks.map((child) => (
                            <RenderBlock key={child.id} block={child} />
                        ))}
                    </ColumnDropZone>
                ))}
            </div>
        );
    }

    if (block.type === "text") {
        return <p className="p-2 border mb-2">{block.label}</p>;
    }

    return null; // Unknown block
};

// Handles drop inside a column
const ColumnDropZone = ({ children, block, columnIndex }) => {
    const { setNodeRef } = useDroppable({
        id: `${block.id}-column-${columnIndex}`,
        data: { type: "column", blockId: block.id, columnIndex },
    });

    return (
        <div
            ref={setNodeRef}
            className="flex-1 border p-2 min-h-[100px]"
        >
            {children.length === 0 ? "Drop here" : children}
        </div>
    );
};

export default RenderBlock;
