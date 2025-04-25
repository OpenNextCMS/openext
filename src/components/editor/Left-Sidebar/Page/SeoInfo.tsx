'use client';

interface Props {
  formData: {
    seoName: string;
    seoMeta: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function SeoInfo({ formData, onChange }: Props) {
  return (
    <div className="space-y-5 mt-5">
      {/* SEO Title */}
      <div className="flex flex-col gap-2">
        <label htmlFor="seoName" className="text-sm font-medium text-black dark:text-gray-50">
          SEO Title
        </label>
        <input
          id="seoName"
          type="text"
          value={formData.seoName}
          onChange={(e) => onChange('seoName', e.target.value)}
          className="border rounded px-3 py-2 text-sm bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>

      {/* SEO Description */}
      <div className="flex flex-col gap-2">
        <label htmlFor="seoMeta" className="text-sm font-medium text-black dark:text-gray-50">
          SEO Description
        </label>
        <textarea
          id="seoMeta"
          value={formData.seoMeta}
          onChange={(e) => onChange('seoMeta', e.target.value)}
          className="border rounded px-3 py-2 text-sm min-h-[80px] bg-white text-gray-900 dark:bg-black dark:text-white dark:border-gray-600"
        />
      </div>
    </div>
  );
}
