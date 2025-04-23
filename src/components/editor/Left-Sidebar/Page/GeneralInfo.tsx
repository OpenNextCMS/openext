'use client';

interface Props {
  formData: {
    pageName: string;
    preHeading: string;
    description: string;
    slug?: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function GeneralInfo({ formData, onChange }: Props) {
  return (
    <div className="space-y-5">
      {/* Page Name */}
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={formData.pageName || ''}
          onChange={(e) => onChange('pageName', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Slug */}
      <div className="flex flex-col gap-2">
        <label htmlFor="slug" className="text-sm font-medium text-gray-700">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={formData.slug || ''}
          onChange={(e) => onChange('slug', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Pre-Heading */}
      <div className="flex flex-col gap-2">
        <label htmlFor="preHead" className="text-sm font-medium text-gray-700">
          Pre-Heading
        </label>
        <input
          id="preHead"
          type="text"
          value={formData.preHeading || ''}
          onChange={(e) => onChange('preHeading', e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
          className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
