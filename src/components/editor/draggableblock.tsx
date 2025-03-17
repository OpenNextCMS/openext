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
            className="p-2 text-left rounded-lg hover:bg-muted cursor-grab w-full mb-2 transition-colors duration-200 dark:text-foreground"
        >
            {block.label}
        </button>
    )
}

export default DraggableBlock

