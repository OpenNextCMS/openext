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
    });

    return (
        <div
            ref={setNodeRef}
            className="flex-1 border p-2 min-h-[100px] bg-gray-50 rounded-md shadow-inner"
        >
            {children}
        </div>
    );
};

export default RenderBlock;
