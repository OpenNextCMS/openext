'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BrainCircuit, KeyRound, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AiSettingsForm = {
  openrouterApiKey: string;
  openrouterModel: string;
  openrouterReviewModel: string;
  aiMinQualityScore: number;
};

const defaultForm: AiSettingsForm = {
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2.0-flash-001',
  openrouterReviewModel: 'google/gemini-2.0-flash-001',
  aiMinQualityScore: 80,
};

export default function AiSettingsPage() {
  const [form, setForm] = useState<AiSettingsForm>(defaultForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${backendUrl}/api/dashboard/ai-settings`, {
          credentials: 'include',
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to load AI settings');
        }

        setForm({
          ...defaultForm,
          ...(result.data?.aiConfig || {}),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load AI settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [backendUrl]);

  const updateField = <K extends keyof AiSettingsForm>(field: K, value: AiSettingsForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`${backendUrl}/api/dashboard/ai-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save AI settings');
      }

      setForm({
        ...defaultForm,
        ...(result.data?.aiConfig || {}),
      });
      toast.success('AI settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">AI Settings</h1>
        </div>
        <p className="mt-2 text-muted-foreground">
          Configure OpenRouter for the editor Prompt tab (text and image-to-page JSON).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            OpenRouter
          </CardTitle>
          <CardDescription>
            Get a key at{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              openrouter.ai/keys
            </a>
            . Keys start with <code className="text-xs">sk-or-</code>, or set{' '}
            <code className="text-xs">OPENROUTER_API_KEY</code> in <code className="text-xs">.env</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="openrouterApiKey">OpenRouter API Key</Label>
            <Input
              id="openrouterApiKey"
              type="password"
              autoComplete="off"
              value={form.openrouterApiKey}
              placeholder="sk-or-v1-..."
              onChange={(event) => updateField('openrouterApiKey', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave the masked value unchanged to keep the saved key.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model Configuration</CardTitle>
          <CardDescription>
            OpenRouter model IDs (e.g. from{' '}
            <a
              href="https://openrouter.ai/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              openrouter.ai/models
            </a>
            ). Use vision-capable models when generating from screenshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="openrouterModel">Main Model</Label>
            <Input
              id="openrouterModel"
              value={form.openrouterModel}
              onChange={(event) => updateField('openrouterModel', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openrouterReviewModel">Review Model</Label>
            <Input
              id="openrouterReviewModel"
              value={form.openrouterReviewModel}
              onChange={(event) => updateField('openrouterReviewModel', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aiMinQualityScore">Minimum Quality Score</Label>
            <Input
              id="aiMinQualityScore"
              type="number"
              min={0}
              max={100}
              value={form.aiMinQualityScore}
              onChange={(event) =>
                updateField(
                  'aiMinQualityScore',
                  Number(event.target.value || defaultForm.aiMinQualityScore)
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save AI Settings
        </Button>
      </div>
    </div>
  );
}
