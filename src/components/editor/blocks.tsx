"use client"
import DraggableBlock from "./draggableblock"
import { v4 as uuidv4 } from "uuid"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    {
        id: "heading",
        label: "Heading",
        type: "text",
        content: "Heading Block",
    },
    {
        id: "image",
        label: "Image",
        type: "text",
        content: "Image Placeholder",
    },
]

export default function Block({ toggleSidebar }) {
    return (
        <div className="w-64 h-screen bg-background border-r border-border p-4 shadow-lg transition-colors duration-300">
            <div className="flex items-center justify-end mb-4">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleSidebar}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-1">
                {blockData.map((block) => (
                    <DraggableBlock key={block.id} block={{ ...block, id: uuidv4() }} />
                ))}
            </div>
        </div>
    )
}

