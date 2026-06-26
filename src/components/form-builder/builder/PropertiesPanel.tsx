'use client';

import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectSelectedField, updateField } from '@/redux/formBuilderSlice';
import { FieldSettingsForm } from './FieldSettingsForm';
import { ValidationRulesEditor } from './ValidationRulesEditor';
import { ConditionalLogicEditor } from './ConditionalLogicEditor';
import { fieldTypeLabel } from '@/components/form-builder/fields/library';

export function PropertiesPanel() {
  const dispatch = useAppDispatch();
  const field = useAppSelector(selectSelectedField);

  if (!field) {
    return (
      <aside className="flex h-full flex-col items-center justify-center border-l bg-background p-6 text-center text-muted-foreground">
        <MousePointerClick className="mb-3 h-8 w-8" />
        <p className="text-sm">Select a field to edit its settings.</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l bg-background">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">{field.label || 'Field'}</h2>
        <p className="text-xs text-muted-foreground">{fieldTypeLabel(field.type)}</p>
      </div>
      <Tabs defaultValue="settings" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="m-2 grid grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="validation">Rules</TabsTrigger>
          <TabsTrigger value="logic">Logic</TabsTrigger>
          <TabsTrigger value="advanced">More</TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="settings">
            <FieldSettingsForm field={field} />
          </TabsContent>
          <TabsContent value="validation">
            <ValidationRulesEditor field={field} />
          </TabsContent>
          <TabsContent value="logic">
            <ConditionalLogicEditor field={field} />
          </TabsContent>
          <TabsContent value="advanced">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="adv-step">Step (multi-step forms)</Label>
                <Input
                  id="adv-step"
                  type="number"
                  min={1}
                  value={field.step ?? 1}
                  onChange={(e) =>
                    dispatch(updateField({ id: field.id, patch: { step: Math.max(1, parseInt(e.target.value, 10) || 1) } }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Field ID</Label>
                <Input value={field.id} readOnly className="font-mono text-xs text-muted-foreground" />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
