import React from 'react';
import { Label } from '@/components/ui/label';
import { PropertyInput } from './PropertyInput';
import { PropertyImageInput } from './PropertyImageInput';
import { IconPicker } from './IconPicker';

type ContentRecord = Record<string, unknown>;

interface ContentPropertiesProps {
  type: string;
  content: ContentRecord;
  handleJsonContentChange: (key: string, value: unknown) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, callback: (path: string) => void) => void;
  isUploadingImage: boolean;
}

export const ContentProperties: React.FC<ContentPropertiesProps> = ({
  type,
  content,
  handleJsonContentChange,
  handleImageUpload,
  isUploadingImage,
}) => {
  if (type === 'statistics-main' || type === 'statistics-side-image' || type === 'statistics-boxed') {
    const stats = Array.isArray(content.stats) ? content.stats : [];

    const updateStat = (index: number, key: string, value: unknown) => {
      const newStats = [...stats];
      newStats[index] = { ...newStats[index], [key]: value };
      handleJsonContentChange('stats', newStats);
    };

    return (
      <div className="space-y-6">
        {type === 'statistics-side-image' && (
          <PropertyImageInput 
            label="Side Image" 
            value={content.image} 
            onChange={(v) => handleJsonContentChange('image', v)} 
            onUpload={handleImageUpload} 
            isUploading={isUploadingImage} 
          />
        )}
        
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Statistics List</Label>
            <button
              onClick={() => {
                const newStats = [...stats, { value: '0', label: 'New Stat', icon: 'activity' }];
                handleJsonContentChange('stats', newStats);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Stat
            </button>
          </div>
          {stats.map((stat: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newStats = stats.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('stats', newStats);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Stat #{index + 1}</Label>
              {type === 'statistics-boxed' && (
                <IconPicker 
                  label="Stat" 
                  value={stat.icon} 
                  onChange={(v) => updateStat(index, 'icon', v)} 
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'testimonial-main') {
    const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];

    const updateTestimonial = (index: number, key: string, value: unknown) => {
      const updated = [...testimonials];
      updated[index] = { ...updated[index], [key]: value };
      handleJsonContentChange('testimonials', updated);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Testimonials</Label>
            <button
              onClick={() => {
                const updated = [...testimonials, { text: 'New testimonial...', name: 'Name', role: 'Role', image: '' }];
                handleJsonContentChange('testimonials', updated);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Item
            </button>
          </div>
          {testimonials.map((testimonial: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const updated = testimonials.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('testimonials', updated);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Testimonial #{index + 1}</Label>
              <PropertyImageInput 
                label="User Image" 
                value={testimonial.image} 
                onChange={(v) => updateTestimonial(index, 'image', v)} 
                onUpload={handleImageUpload} 
                isUploading={isUploadingImage} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'content-features') {
    const features = Array.isArray(content.features) ? content.features : [];

    const updateFeature = (index: number, key: string, value: unknown) => {
      const updatedFeatures = [...features];
      updatedFeatures[index] = { ...updatedFeatures[index], [key]: value };
      handleJsonContentChange('features', updatedFeatures);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Feature List</Label>
            <button
              onClick={() => {
                const newFeatures = [...features, { title: 'New Feature', description: 'Feature description...' }];
                handleJsonContentChange('features', newFeatures);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Feature
            </button>
          </div>
          {features.map((feature: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newFeatures = features.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('features', newFeatures);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Feature #{index + 1}</Label>
              <PropertyInput label="Redirect URL" value={feature.url} onChange={(v) => updateFeature(index, 'url', v)} placeholder="https://..." />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2 border-t">
          <PropertyInput label="Global Redirect URL" value={content.linkUrl} onChange={(v: string) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  if (type === 'content-gallery') {
    const items = Array.isArray(content.items) ? content.items : [];

    const updateItem = (index: number, key: string, value: unknown) => {
      const updatedItems = [...items];
      updatedItems[index] = { ...updatedItems[index], [key]: value };
      handleJsonContentChange('items', updatedItems);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Gallery Items</Label>
            <button
              onClick={() => {
                const newItems = [...items, { image: 'https://dummyimage.com/720x400', subtitle: 'SUBTITLE', title: 'New Item', description: 'Description here...' }];
                handleJsonContentChange('items', newItems);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Item
            </button>
          </div>
          {items.map((item: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newItems = items.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('items', newItems);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Item #{index + 1}</Label>
              <PropertyImageInput 
                label="Image" 
                value={item.image} 
                onChange={(v) => updateItem(index, 'image', v)} 
                onUpload={handleImageUpload} 
                isUploading={isUploadingImage} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'content-icons') {
    const features = Array.isArray(content.features) ? content.features : [];

    const updateFeature = (index: number, key: string, value: unknown) => {
      const updatedFeatures = [...features];
      updatedFeatures[index] = { ...updatedFeatures[index], [key]: value };
      handleJsonContentChange('features', updatedFeatures);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Icon Features</Label>
            <button
              onClick={() => {
                const newFeatures = [...features, { title: 'New Feature', description: 'Feature description...', image: '' }];
                handleJsonContentChange('features', newFeatures);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Feature
            </button>
          </div>
          {features.map((feature: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newFeatures = features.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('features', newFeatures);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Feature #{index + 1}</Label>
              <PropertyImageInput 
                label="Image/Icon" 
                value={feature.image} 
                onChange={(v) => updateFeature(index, 'image', v)} 
                onUpload={handleImageUpload} 
                isUploading={isUploadingImage} 
              />
              <PropertyInput label="Redirect URL" value={feature.url} onChange={(v) => updateFeature(index, 'url', v)} placeholder="https://..." />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2 border-t">
          <PropertyInput label="Global Redirect URL" value={content.linkUrl} onChange={(v: string) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
          <PropertyInput label="Main Button Redirect URL" value={content.buttonUrl} onChange={(v: string) => handleJsonContentChange('buttonUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  if (type === 'content-categories') {
    const rawLinks = (content.links as unknown[]) || [];
    const links: ContentRecord[] = rawLinks.map((link: unknown) =>
      typeof link === 'string' ? ({ text: link, url: '#' } as ContentRecord) : (link as ContentRecord)
    );

    const updateLink = (index: number, field: 'text' | 'url', value: string) => {
      const newLinks = [...links];
      newLinks[index] = { ...newLinks[index], [field]: value };
      handleJsonContentChange('links', newLinks);
    };

    return (
      <div className="space-y-4">
        <PropertyInput label="Link Redirect URL" value={content.linkUrl} onChange={(v: string) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
        
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Categories List</Label>
            <button
              onClick={() => {
                const newLinks = [...links, { text: 'New Link', url: '#' }];
                handleJsonContentChange('links', newLinks);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Link
            </button>
          </div>
          {links.map((link: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newLinks = links.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('links', newLinks);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Link #{index + 1}</Label>
              <PropertyInput label="Redirect URL" value={link.url} onChange={(v) => updateLink(index, 'url', v)} placeholder="https://..." />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'content-detail') {
    return (
      <div className="space-y-4">
        <PropertyImageInput label="Hero Image" value={content.heroImage} onChange={(v) => handleJsonContentChange('heroImage', v)} onUpload={handleImageUpload} isUploading={isUploadingImage} />
        <PropertyImageInput label="Author Image" value={content.authorImage} onChange={(v) => handleJsonContentChange('authorImage', v)} onUpload={handleImageUpload} isUploading={isUploadingImage} />
        <PropertyInput label="Link Redirect URL" value={content.linkUrl} onChange={(v) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
      </div>
    );
  }

  if (type === 'content-split') {
    const left = (content.left as ContentRecord | undefined) ?? {};
    const right = (content.right as ContentRecord | undefined) ?? {};
    return (
      <div className="space-y-4">
        <div className="space-y-2 border-b pb-2">
          <Label className="text-[11px] font-bold text-primary">Left Card</Label>
          <PropertyImageInput label="Image" value={left.image} onChange={(v) => handleJsonContentChange('left', { ...left, image: v })} onUpload={handleImageUpload} isUploading={isUploadingImage} />
          <PropertyInput label="Redirect URL" value={left.url} onChange={(v) => handleJsonContentChange('left', { ...left, url: v })} placeholder="https://..." />
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] font-bold text-primary">Right Card</Label>
          <PropertyImageInput label="Image" value={right.image} onChange={(v) => handleJsonContentChange('right', { ...right, image: v })} onUpload={handleImageUpload} isUploading={isUploadingImage} />
          <PropertyInput label="Redirect URL" value={right.url} onChange={(v) => handleJsonContentChange('right', { ...right, url: v })} placeholder="https://..." />
        </div>
      </div>
    );
  }

  if (type === 'content-trio') {
    const items = Array.isArray(content.items) ? content.items : [];

    const updateItem = (index: number, key: string, value: unknown) => {
      const updatedItems = [...items];
      updatedItems[index] = { ...updatedItems[index], [key]: value };
      handleJsonContentChange('items', updatedItems);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Card Trio</Label>
            <button
              onClick={() => {
                const newItems = [...items, { image: 'https://dummyimage.com/1203x503', title: 'New Card', description: 'Description here...' }];
                handleJsonContentChange('items', newItems);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Card
            </button>
          </div>
          {items.map((item: ContentRecord, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newItems = items.filter((_: ContentRecord, i: number) => i !== index);
                  handleJsonContentChange('items', newItems);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Card #{index + 1}</Label>
              <PropertyImageInput 
                label="Image" 
                value={item.image} 
                onChange={(v) => updateItem(index, 'image', v)} 
                onUpload={handleImageUpload} 
                isUploading={isUploadingImage} 
              />
              <PropertyInput label="Redirect URL" value={item.url} onChange={(v) => updateItem(index, 'url', v)} placeholder="https://..." />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-2 border-t">
          <PropertyInput label="Global Redirect URL" value={content.linkUrl} onChange={(v: string) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  return null;
};
