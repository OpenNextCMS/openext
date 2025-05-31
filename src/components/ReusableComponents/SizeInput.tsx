import React from 'react';
import { Input } from '../ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

interface InputSelectProps {
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
  options?: { label: string; value: string }[];
}

const defaultOptions = [
  { label: 'px', value: 'px' },
  { label: 'rem', value: 'rem' },
  { label: '%', value: '%' },
];

export default function InputSelect({
  placeholder = '8',
  value,
  onValueChange,
  unitValue = 'px',
  onUnitChange,
  options = defaultOptions,
}: InputSelectProps) {
  return (
    <div className="flex gap-2 flex-1">
      <Input
        className="h-8 text-xs"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
      />
      <Select value={unitValue} onValueChange={(val) => onUnitChange?.(val)}>
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
  unitValue = 'px',
  onUnitChange,
  options = defaultOptions,
}: {
  unitValue?: string;
  onUnitChange?: (unit: string) => void;
  options?: { label: string; value: string }[];
}) {
  return (
    <div className="flex gap-2 flex-1">
      <Select value={unitValue} onValueChange={(val) => onUnitChange?.(val)}>
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
