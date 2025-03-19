"use client"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"

const DraggableBlock = ({ block }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: block.id,
        data: block,
    })
    const style = {
        transform: CSS.Translate.toString(transform),
    }

    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={style}
            className="flex items-center w-full text-left cursor-grab transition-colors duration-200 group-hover:text-primary"
        >
            <span className="truncate">{block.label}</span>
        </button>
    )
}

export default DraggableBlock

