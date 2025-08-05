import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface SelectCompProps {
  label?: string;
  defaultValue?: string;
  value?: string;
  options: { label: string; value: string }[];
  onValueChange?: (value: string) => void;
}

export default function SelectComp({
  label = 'Font Weight',
  defaultValue = '400',
  value,
  onValueChange,
  options,
}: SelectCompProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs w-16">{label}</Label>
      <div className="flex gap-2 border border-border rounded-md">
        <Select value={value} onValueChange={onValueChange} defaultValue={defaultValue}>
          <SelectTrigger className="h-8 text-xs">
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
    </div>
  );
}
