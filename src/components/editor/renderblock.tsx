"use client"
import { useDroppable } from "@dnd-kit/core"
import { GripVertical, Type, Columns, MousePointerClick } from "lucide-react"
import { useState } from "react"

const RenderBlock = ({ block }) => {
    const [isHovered, setIsHovered] = useState(false)

"use client";
import { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    Type,
    Heading1,
    SeparatorHorizontal,
    Gem,
    FormInput,
    CheckSquare,
    Dot,
} from "lucide-react";
interface ColumnDropZoneProps {
    children: ReactNode;
    block: { uniqueId: string }; // Adjust type as per your block structure
    columnIndex: number;
}
interface Block {
    uniqueId: string;
    type: string;
    content?: string;
    children?: Block[][]; // Nested array for columns
}
const RenderBlock: React.FC<{ block: Block }> = ({ block }) => {
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
            <div className="flex gap-4 border p-2 mb-4 bg-gray-100 rounded-lg">
                {(block.children ?? []).map((childBlocks, index) => (
                    <ColumnDropZone key={`${block.uniqueId}-col-${index}`} columnIndex={index} block={block}>
                        {childBlocks.length > 0 ? (
                            childBlocks.map((child) => (
                                <RenderBlock key={child.uniqueId} block={child} />
                            ))
                        ) : (
                            <p className="text-gray-400 text-center">Drop here</p>
                        )}
                    </ColumnDropZone>
                ))}
            </div>
        );
    }
    if (block.type === "columns-2") {
        return (
            <div className="flex gap-4 border p-2 mb-4 bg-gray-100 rounded-lg">
                {(block.children ?? []).map((childBlocks, index) => (
                    <ColumnDropZone
                        key={`${block.uniqueId}-col-${index}`}
                        columnIndex={index}
                        block={block}
                    >
                        {childBlocks.length > 0 ? (
                            childBlocks.map((child) => (
                                <RenderBlock key={child.uniqueId} block={child} />
                            ))
                        ) : (
                            <p className="text-gray-400 text-center">Drop here</p>
                        )}
                    </ColumnDropZone>
                ))}
            </div>
        );
    }
    if (block.type === "columns-3") {
        return (
            <div className="flex gap-4 border p-2 mb-4 bg-gray-100 rounded-lg">
                {(block.children ?? []).map((childBlocks, index) => (
                    <ColumnDropZone
                        key={`${block.uniqueId}-col-${index}`}
                        columnIndex={index}
                        block={block}
                    >
                        {childBlocks.length > 0 ? (
                            childBlocks.map((child) => (
                                <RenderBlock key={child.uniqueId} block={child} />
                            ))
                        ) : (
                            <p className="text-gray-400 text-center">Drop here</p>
                        )}
                    </ColumnDropZone>
                ))}
            </div>
        );
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
    return <BlockContent block={block} />;
};

const BlockContent = ({ block }) => {
    switch (block.type) {
        case "text":
            return <BlockWrapper><p>{block.content}</p></BlockWrapper>;
        case "heading":
            return <BlockWrapper><Heading1 size={24} /> <h1>{block.content}</h1></BlockWrapper>;
        case "divider":
            return <BlockWrapper><hr className="w-full border-t-2" /></BlockWrapper>;
        case "icon":
            return <BlockWrapper><Gem size={24} /></BlockWrapper>;
        case "input":
            return <BlockWrapper><FormInput size={20} /> <input className="border p-2 w-full" placeholder="Enter text" /></BlockWrapper>;
        // case "textarea":
        //     return <BlockWrapper><Textarea size={20} /> <textarea className="border p-2 w-full h-20" placeholder="Enter description" /></BlockWrapper>;
        case "checkbox":
            return <BlockWrapper><CheckSquare size={20} /> <input type="checkbox" className="ml-2" /></BlockWrapper>;
        case "radio":
            return <BlockWrapper><Dot size={20} /> <input type="radio" className="ml-2" /></BlockWrapper>;
        default:
            return null;
    }
};

const BlockWrapper = ({ children }) => (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white shadow-sm mb-2">
        {children}
    </div>
);

const ColumnDropZone: React.FC<ColumnDropZoneProps> = ({ children, block, columnIndex }) => {
    const { setNodeRef } = useDroppable({
        id: `${block.uniqueId}-column-${columnIndex}`,
        data: { type: "column", blockId: block.uniqueId, columnIndex },
    })

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 border rounded-md p-3 min-h-[150px] transition-colors ${isOver ? "bg-primary/10 border-primary border-dashed" : "bg-muted/20 hover:bg-muted/30 border-border"
                }`}
            className="flex-1 border p-2 min-h-[100px] bg-gray-50 rounded-md shadow-inner"
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
