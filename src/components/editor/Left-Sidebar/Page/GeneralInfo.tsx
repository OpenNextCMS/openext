'use client';
import { apiUrl } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TemplateOption {
  key: string;
  name: string;
}

interface Props {
  formData: {
    pageName: string;
    preHeading: string;
    description: string;
    slug?: string;
    pageType?: 'page' | 'header' | 'footer' | 'blog';
    isHome?: boolean;
    isGlobal?: boolean;
    themeTemplate?: string;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export default function GeneralInfo({ formData, onChange }: Props) {
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const isPage = (formData.pageType || 'page') === 'page';

  useEffect(() => {
    if (!isPage) return;
    fetch(apiUrl('/api/theme-engine/templates'))
      .then((r) => r.json())
      .then((json) => {
        const list = json?.data?.templates as TemplateOption[] | undefined;
        if (Array.isArray(list)) setTemplates(list);
      })
      .catch(() => undefined);
  }, [isPage]);

  return (
    <div className="space-y-5">
      {(formData.pageType || 'page') === 'page' ? (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-black dark:text-gray-50">
            Set as Home Page
          </label>
          <Switch
            checked={formData.isHome || false}
            onCheckedChange={(checked: boolean) => onChange('isHome', checked)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-black dark:text-gray-50">
            Use as Active {formData.pageType === 'header' ? 'Header' : 'Footer'}
          </label>
          <Switch
            checked={formData.isGlobal || false}
            onCheckedChange={(checked: boolean) => onChange('isGlobal', checked)}
          />
        </div>
      )}

      {isPage && templates.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-black dark:text-gray-50">Template</label>
          <Select
            value={formData.themeTemplate || '__default__'}
            onValueChange={(v) => onChange('themeTemplate', v === '__default__' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Default (auto)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__default__">Default (auto)</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.name} ({t.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Templates come from the active Theme Engine theme.
          </p>
        </div>
      )}

      {/* Page Name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-black dark:text-gray-50">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.pageName || ''}
          onChange={(e) => onChange('pageName', e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-2">
        <label htmlFor="slug" className="text-sm font-medium text-black dark:text-gray-50">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={formData.slug || ''}
          onChange={(e) => onChange('slug', e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Pre-Heading */}
      <div className="flex flex-col gap-2">
        <label htmlFor="preHead" className="text-sm font-medium text-black dark:text-gray-50">
          Pre-Heading
        </label>
        <input
          id="preHead"
          type="text"
          value={formData.preHeading || ''}
          onChange={(e) => onChange('preHeading', e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-black dark:text-gray-50">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>
    </div>
  );
}
