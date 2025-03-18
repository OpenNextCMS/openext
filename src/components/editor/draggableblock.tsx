"use client";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
    Columns,
    LayoutGrid,
    SplitSquareVertical,
    Heading1,
    Type,
    Link,
    ExternalLink,
    Image,
    FileImage,
    Video,
    Map,
    Gem,
    Rows,
    SeparatorHorizontal,
    Square,
    FormInput,
    TextCursorInput,
    ListChecks,
    Dot,
    Circle
} from "lucide-react";

const DraggableBlock = ({ block }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: block.id,
        data: block,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    const getBlockIcon = () => {
        switch (block.type) {
            case "column":
                return <LayoutGrid size={30} />;
            case "columns-2":
                return <Columns size={30} />;
            case "columns-3":
                return <Columns size={30} />;
            case "columns-3-7":
                return <SplitSquareVertical size={30} />;
            case "section":
                return <Rows size={30} />;
            case "divider":
                return <SeparatorHorizontal size={30} />;
            case "heading":
                return <Heading1 size={30} />;
            case "text":
                return <Type size={30} />;
            case "link":
                return <Link size={30} />;
            case "link-box":
                return <ExternalLink size={30} />;
            case "image":
                return <Image size={30} />;
            case "image-box":
                return <FileImage size={30} />;
            case "video":
                return <Video size={30} />;
            case "map":
                return <Map size={30} />;
            case "icon":
                return <Gem size={30} />;
            case "form":
                return <Square size={30} />;
            case "input":
                return <FormInput size={30} />;
            case "textarea":
                return <TextCursorInput size={30} />;
            case "label":
                return <ListChecks size={30} />;
            case "checkbox":
                return <Dot size={30} />;
            case "radio":
                return <Circle size={30} />;
            default:
                return <LayoutGrid size={30} />;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-md transition-all duration-300 ease-in-out hover:bg-gray-100 active:scale-95 cursor-grab w-28 h-28 border border-gray-200"
            {...listeners}
            {...attributes}
        >
            <div className="flex items-center justify-center h-12 text-gray-700">
                {getBlockIcon()}
            </div>
            <div className="text-xs font-medium text-center mt-2 text-gray-800">
                {block.label}
            </div>
        </div>
    );
};

export default DraggableBlock;
