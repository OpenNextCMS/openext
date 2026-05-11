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
  { label: 'vw', value: 'vw' },
  { label: 'vh', value: 'vh' },
];

export default function InputSelect({
  placeholder = 'auto',
  value = '',
  onValueChange,
  unitValue = 'px',
  onUnitChange,
  options = defaultOptions,
}: InputSelectProps) {
  return (
    <div className="flex gap-1 flex-1 items-center min-w-0">
      <Input
        className="h-9 text-sm flex-1 bg-background px-2 min-w-0"
        value={value || ''}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder={placeholder}
      />
      <Select value={unitValue} onValueChange={(val) => onUnitChange?.(val)}>
        <SelectTrigger className="h-9 text-xs w-[58px] px-2 shrink-0 bg-background border-l-0 rounded-l-none">
          <SelectValue placeholder="unit" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
