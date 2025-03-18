"use client";
import DraggableBlock from "./draggableblock";
import { v4 as uuidv4 } from "uuid";

const blockData = [
    { id: "1-column", label: "1 Column", type: "column", children: [[]] },
    { id: "2-column", label: "2 Columns", type: "columns-2", children: [[], []] },
    { id: "3-column", label: "3 Columns", type: "columns-3", children: [[], [], []] },
    { id: "divider", label: "Divider", type: "divider" },
    { id: "section", label: "Section", type: "section", children: [] },
    { id: "text", label: "Text", type: "text", content: "Demo Text" },
    { id: "icon", label: "Icon", type: "icon" },
    { id: "forms", label: "Forms", type: "form", children: [] },
    { id: "input", label: "Input", type: "input" },
    { id: "textarea", label: "Textarea", type: "textarea" },
    { id: "label", label: "Label", type: "label" },
    { id: "checkbox", label: "Checkbox", type: "checkbox" },
    { id: "radio", label: "Radio", type: "radio" },

];

export default function Sidebar() {
    return (
        <div className="grid grid-cols-2 gap-4">
            {blockData.map((block) => (
                <DraggableBlock key={block.id} block={{ ...block, id: uuidv4() }} />
            ))}
        </div>
    );
}

