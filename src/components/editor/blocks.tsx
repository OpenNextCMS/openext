"use client";
import DraggableBlock from "./draggableblock";

const blockData = [
    {
        id: "2-column",
        label: "2 Column",
        type: "column",
        children: [[], []],
    },
    {
        id: "text",
        label: "Text",
        type: "text",
        content: "Demo Data for Text Block",
    },
];

export default function Sidebar() {
    return (
        <div className="w-64 h-screen bg-gray-100 p-4 shadow-lg">
            {blockData.map((block) => (
                <DraggableBlock key={block.id} block={block} />
            ))}
        </div>
    );
}

