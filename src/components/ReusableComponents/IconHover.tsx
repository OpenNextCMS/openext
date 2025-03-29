import React from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

interface IconHoverProps {
    icon: React.ReactNode; // Accepts JSX elements (icons)
    iconName: string; // Tooltip text
}

export default function IconHover({ icon, iconName }: IconHoverProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{icon}</TooltipTrigger>
                <TooltipContent>
                    <p>{iconName}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
