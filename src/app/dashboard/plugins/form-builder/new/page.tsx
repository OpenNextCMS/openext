'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Mail, Users, ClipboardList, FileText, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormBuilderGate } from '@/components/form-builder/FormBuilderGate';
import { formApi } from '@/components/form-builder/api';
import { createField } from '@/components/form-builder/fields/library';
import type { IFormField } from '@/types/form-builder';

interface Template {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  build: () => IFormField[];
}

function f(type: Parameters<typeof createField>[0], label: string, order: number, required = false): IFormField {
  return { ...createField(type, order), label, required };
}

const TEMPLATES: Template[] = [
  {
    key: 'contact',
    name: 'Contact',
    icon: <Mail className="h-5 w-5" />,
    description: 'Name, email and message.',
    build: () => [
      f('text', 'Name', 0, true),
      f('email', 'Email', 1, true),
      f('textarea', 'Message', 2, true),
    ],
  },
  {
    key: 'lead',
    name: 'Lead Gen',
    icon: <Users className="h-5 w-5" />,
    description: 'Capture qualified leads.',
    build: () => [
      f('text', 'Full name', 0, true),
      f('email', 'Work email', 1, true),
      f('text', 'Company', 2),
      f('phone', 'Phone', 3),
    ],
  },
  {
    key: 'survey',
    name: 'Survey',
    icon: <ClipboardList className="h-5 w-5" />,
    description: 'Collect structured feedback.',
    build: () => [
      f('rating', 'How satisfied are you?', 0, true),
      { ...createField('radio', 1), label: 'Would you recommend us?', options: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
      ] },
      f('textarea', 'Additional comments', 2),
    ],
  },
  {
    key: 'blank',
    name: 'Blank',
    icon: <FileText className="h-5 w-5" />,
    description: 'Start from scratch.',
    build: () => [],
  },
];

function NewForm() {
  const router = useRouter();
  const [name, setName] = useState('Untitled form');
  const [creating, setCreating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const create = async (fields: IFormField[]) => {
    setCreating(true);
    try {
      const form = await formApi.create({ name, fields, status: undefined });
      toast.success('Form created');
      router.push(`/dashboard/plugins/form-builder/${form._id}/edit`);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(false);
    }
  };

  const generate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const fields = await formApi.aiGenerate(aiPrompt);
      // Ensure ids/order are normalized.
      const normalized = fields.map((fld, i) => ({ ...fld, id: fld.id || uuidv4(), order: i }));
      await create(normalized);
    } catch (e) {
      toast.error((e as Error).message);
      setAiLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Create a form</h1>
      <p className="mb-6 text-sm text-muted-foreground">Pick a starting point or generate one with AI.</p>

      <div className="mb-6 space-y-1.5">
        <Label htmlFor="form-name">Form name</Label>
        <Input id="form-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            disabled={creating}
            onClick={() => create(t.build())}
            className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-50"
          >
            <span className="text-primary">{t.icon}</span>
            <span className="font-medium">{t.name}</span>
            <span className="text-xs text-muted-foreground">{t.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-muted/40 p-4">
        <Label htmlFor="ai-prompt" className="mb-2 flex items-center gap-1">
          <Sparkles className="h-4 w-4" /> Generate with AI
        </Label>
        <Textarea
          id="ai-prompt"
          value={aiPrompt}
          placeholder="e.g. A job application form with name, email, resume upload and availability"
          onChange={(e) => setAiPrompt(e.target.value)}
        />
        <Button className="mt-3" onClick={generate} disabled={aiLoading || creating || !aiPrompt.trim()}>
          {aiLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Generate form
        </Button>
      </div>
    </div>
  );
}

export default function NewFormPage() {
  return (
    <FormBuilderGate>
      <NewForm />
    </FormBuilderGate>
  );
}
