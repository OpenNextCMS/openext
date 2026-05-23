'use client';
import { Switch } from '@/components/ui/switch';

interface Props {
  formData: {
    pageName: string;
    preHeading: string;
    description: string;
    slug?: string;
    pageType?: 'page' | 'header' | 'footer' | 'blog';
    isHome?: boolean;
    isGlobal?: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export default function GeneralInfo({ formData, onChange }: Props) {
  return (
    <div className="space-y-5">
      {/* Home Page Toggle */}
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
