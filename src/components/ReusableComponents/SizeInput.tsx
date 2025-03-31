import React from "react";
import { Input } from "../ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/select";

interface InputSelectProps {
    placeholder?: string;
    defaultValue?: string;
    options?: { label: string; value: string }[];
}

export default function InputSelect({
    placeholder = "8",
    defaultValue = "px",
    options = [
        { label: "px", value: "px" },
        { label: "rem", value: "rem" },
        { label: "%", value: "%" },
    ],
}: InputSelectProps) {
    return (
        <div className="flex gap-2 flex-1">
            <Input className="h-8 text-xs" placeholder={placeholder} />
            <Select defaultValue={defaultValue}>
                <SelectTrigger className="h-8 text-xs w-20">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function SelectSize({
    defaultValue = "px",
    options = [
        { label: "px", value: "px" },
        { label: "rem", value: "rem" },
        { label: "%", value: "%" },
    ],
}: InputSelectProps) {
    return (
        <div className="flex gap-2 flex-1">
            <Select defaultValue={defaultValue}>
                <SelectTrigger className="h-8 text-xs w-20">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
