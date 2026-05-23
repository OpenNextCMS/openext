import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const PropertyInput = ({ label, value, onChange, placeholder }: { label: string, value: unknown, onChange: (v: string) => void, placeholder?: string }) => (
  <div className="space-y-1">
    <Label className="text-[10px] text-muted-foreground uppercase">{label}</Label>
    <Input className="h-8 text-sm" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);
