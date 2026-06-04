'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { selectBuilder, updateMeta } from '@/redux/formBuilderSlice';
import type { IFormSettings, WebhookMethod } from '@/types/form-builder';

export function FormSettingsDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const dispatch = useAppDispatch();
  const { form } = useAppSelector(selectBuilder);
  if (!form) return null;
  const settings = form.settings;

  const patchSettings = (p: Partial<IFormSettings>) =>
    dispatch(updateMeta({ settings: { ...settings, ...p } }));
  const patchSection = <K extends keyof IFormSettings>(key: K, p: Partial<IFormSettings[K]>) =>
    patchSettings({ [key]: { ...(settings[key] as object), ...p } } as Partial<IFormSettings>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notify">Email</TabsTrigger>
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="spam">Spam</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-2">
            <Field label="Form name">
              <Input value={form.name} onChange={(e) => dispatch(updateMeta({ name: e.target.value }))} />
            </Field>
            <Field label="Slug">
              <Input value={form.slug} onChange={(e) => dispatch(updateMeta({ slug: e.target.value }))} />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => dispatch(updateMeta({ description: e.target.value }))}
              />
            </Field>
            <Field label="Submit button text">
              <Input
                value={settings.submitButtonText}
                onChange={(e) => patchSettings({ submitButtonText: e.target.value })}
              />
            </Field>
            <Field label="Success message">
              <Textarea
                value={settings.successMessage}
                onChange={(e) => patchSettings({ successMessage: e.target.value })}
              />
            </Field>
            <Field label="Redirect URL (optional)">
              <Input
                value={settings.redirectUrl ?? ''}
                onChange={(e) => patchSettings({ redirectUrl: e.target.value })}
              />
            </Field>
          </TabsContent>

          <TabsContent value="notify" className="space-y-4 pt-2">
            <Toggle
              label="Enable email notifications"
              checked={settings.notifications.enabled}
              onChange={(v) => patchSection('notifications', { enabled: v })}
            />
            <Field label="Admin email">
              <Input
                value={settings.notifications.adminEmail ?? ''}
                onChange={(e) => patchSection('notifications', { adminEmail: e.target.value })}
              />
            </Field>
            <Field label="Admin template ({{variables}})">
              <Textarea
                value={settings.notifications.adminTemplate ?? ''}
                placeholder="New submission from {{name}} ({{email}})"
                onChange={(e) => patchSection('notifications', { adminTemplate: e.target.value })}
              />
            </Field>
            <Field label="User email field id (for autoresponder)">
              <Input
                value={settings.notifications.userEmailField ?? ''}
                onChange={(e) => patchSection('notifications', { userEmailField: e.target.value })}
              />
            </Field>
            <Field label="User autoresponder template">
              <Textarea
                value={settings.notifications.userTemplate ?? ''}
                onChange={(e) => patchSection('notifications', { userTemplate: e.target.value })}
              />
            </Field>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4 pt-2">
            <Toggle
              label="Enable webhook"
              checked={settings.webhook.enabled}
              onChange={(v) => patchSection('webhook', { enabled: v })}
            />
            <Field label="URL">
              <Input
                value={settings.webhook.url ?? ''}
                onChange={(e) => patchSection('webhook', { url: e.target.value })}
              />
            </Field>
            <Field label="Method">
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={settings.webhook.method}
                onChange={(e) => patchSection('webhook', { method: e.target.value as WebhookMethod })}
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </Field>
            <Field label="Retry count">
              <Input
                type="number"
                min={0}
                value={settings.webhook.retryCount}
                onChange={(e) => patchSection('webhook', { retryCount: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>
          </TabsContent>

          <TabsContent value="spam" className="space-y-4 pt-2">
            <Toggle
              label="Honeypot trap"
              checked={settings.spam.honeypot}
              onChange={(v) => patchSection('spam', { honeypot: v })}
            />
            <Toggle
              label="Cloudflare Turnstile"
              checked={settings.spam.turnstileEnabled}
              onChange={(v) => patchSection('spam', { turnstileEnabled: v })}
            />
            <Field label="Turnstile site key">
              <Input
                value={settings.spam.turnstileSiteKey ?? ''}
                onChange={(e) => patchSection('spam', { turnstileSiteKey: e.target.value })}
              />
            </Field>
            <Field label="Throttle limit (per IP / minute)">
              <Input
                type="number"
                min={0}
                value={settings.spam.throttleLimit}
                onChange={(e) => patchSection('spam', { throttleLimit: parseInt(e.target.value, 10) || 0 })}
              />
            </Field>
          </TabsContent>

          <TabsContent value="steps" className="space-y-4 pt-2">
            <Toggle
              label="Enable multi-step form"
              checked={settings.multiStep.enabled}
              onChange={(v) => patchSection('multiStep', { enabled: v })}
            />
            <Toggle
              label="Show progress bar"
              checked={settings.multiStep.showProgressBar}
              onChange={(v) => patchSection('multiStep', { showProgressBar: v })}
            />
            <Toggle
              label="Allow going back"
              checked={settings.multiStep.allowBack}
              onChange={(v) => patchSection('multiStep', { allowBack: v })}
            />
            <p className="text-xs text-muted-foreground">
              Assign each field to a step in the field’s “More” tab.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
