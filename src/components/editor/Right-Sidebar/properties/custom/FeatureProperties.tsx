import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { PropertyInput } from './PropertyInput';
import { PropertyImageInput } from './PropertyImageInput';

export const FeatureProperties = ({ type, content, handleJsonContentChange, handleImageUpload, isUploadingImage }: any) => {
  const features = Array.isArray(content.features) ? content.features : [];

  const updateFeature = (index: number, key: string, value: any) => {
    const updatedFeatures = [...features];
    updatedFeatures[index] = { ...updatedFeatures[index], [key]: value };
    handleJsonContentChange('features', updatedFeatures);
  };

  const renderFeatureList = (title: string, showImage: boolean = false) => (
    <div className="space-y-4 pt-2 border-t mt-4">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-bold text-primary uppercase">{title}</Label>
        <button
          onClick={() => {
            const newFeatures = [...features, { title: 'New Item', description: 'Description...', image: '' }];
            handleJsonContentChange('features', newFeatures);
          }}
          className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
        >
          Add Item
        </button>
      </div>
      {features.map((feature: any, index: number) => (
        <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
          <button
            onClick={() => {
              const newFeatures = features.filter((_: any, i: number) => i !== index);
              handleJsonContentChange('features', newFeatures);
            }}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
          <Label className="text-[10px] font-semibold">Item #{index + 1}</Label>
          {showImage && (
            <PropertyImageInput 
              label="Image/Icon" 
              value={feature.image || feature.icon} 
              onChange={(v) => updateFeature(index, 'image', v)} 
              onUpload={handleImageUpload} 
              isUploading={isUploadingImage} 
            />
          )}
          <PropertyInput label="Redirect URL" value={feature.url} onChange={(v) => updateFeature(index, 'url', v)} placeholder="https://..." />
        </div>
      ))}
    </div>
  );

  if (type === 'feature-trio' || type === 'feature-vertical' || type === 'feature-horizontal' || type === 'feature-boxed' || type === 'feature-zigzag' || type === 'feature-side-image') {
    const hasMainButton = type !== 'feature-side-image' && type !== 'feature-horizontal' && type !== 'feature-boxed';
    
    return (
      <div className="space-y-4">
        {type === 'feature-side-image' && (
          <PropertyImageInput label="Side Image" value={content.image} onChange={(v) => handleJsonContentChange('image', v)} onUpload={handleImageUpload} isUploading={isUploadingImage} />
        )}
        {hasMainButton && (
          <PropertyInput label="Button Redirect URL" value={content.buttonUrl} onChange={(v: string) => handleJsonContentChange('buttonUrl', v)} placeholder="https://..." />
        )}
        {renderFeatureList('Features', true)}
      </div>
    );
  }

  if (type === 'feature-checklist') {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <div className="space-y-4">
        <PropertyInput label="Button Redirect URL" value={content.buttonUrl} onChange={(v: string) => handleJsonContentChange('buttonUrl', v)} placeholder="https://..." />
        <div className="space-y-2 pt-2 border-t mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Checklist Items</Label>
            <button
              onClick={() => {
                const newItems = [...items, 'New Item'];
                handleJsonContentChange('items', newItems);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Item
            </button>
          </div>
          {items.map((_: string, index: number) => (
            <div key={index} className="p-2 border rounded bg-muted/5 relative group flex items-center justify-between">
              <Label className="text-[10px]">Item #{index + 1}</Label>
              <button
                onClick={() => {
                  const newItems = items.filter((_: any, i: number) => i !== index);
                  handleJsonContentChange('items', newItems);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'feature-list') {
    const rawCategories = content.categories || [
      { title: 'CATEGORY', links: ['Link 1', 'Link 2', 'Link 3'] }
    ];

    const categories = rawCategories.map((cat: any) => ({
      ...cat,
      links: (cat.links || []).map((link: any) => 
        typeof link === 'string' ? { text: link, url: '#' } : link
      )
    }));

    const updateCategoryTitle = (idx: number, title: string) => {
      const newCats = [...categories];
      newCats[idx] = { ...newCats[idx], title };
      handleJsonContentChange('categories', newCats);
    };

    const updateLink = (cIdx: number, lIdx: number, field: 'text' | 'url', value: string) => {
      const newCats = JSON.parse(JSON.stringify(categories));
      newCats[cIdx].links[lIdx][field] = value;
      handleJsonContentChange('categories', newCats);
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-primary uppercase">Categories & Links</Label>
            <button
              onClick={() => {
                const newCats = [...categories, { title: 'NEW CATEGORY', links: [{ text: 'New Link', url: '#' }] }];
                handleJsonContentChange('categories', newCats);
              }}
              className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
            >
              Add Category
            </button>
          </div>
          
          {categories.map((cat: any, cIdx: number) => (
            <div key={cIdx} className="space-y-3 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newCats = categories.filter((_: any, i: number) => i !== cIdx);
                  handleJsonContentChange('categories', newCats);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              
              <PropertyInput label="Category Title" value={cat.title} onChange={(v) => updateCategoryTitle(cIdx, v)} placeholder="Category..." />
              
              <div className="space-y-2 pl-2 border-l-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <Label className="text-[9px] uppercase font-bold text-muted-foreground">Links</Label>
                  <button
                    onClick={() => {
                      const newCats = JSON.parse(JSON.stringify(categories));
                      newCats[cIdx].links.push({ text: 'New Link', url: '#' });
                      handleJsonContentChange('categories', newCats);
                    }}
                    className="text-[9px] text-primary hover:underline"
                  >
                    + Add Link
                  </button>
                </div>
                
                {cat.links.map((link: any, lIdx: number) => (
                  <div key={lIdx} className="space-y-1 relative group/link">
                    <button
                      onClick={() => {
                        const newCats = JSON.parse(JSON.stringify(categories));
                        newCats[cIdx].links = newCats[cIdx].links.filter((_: any, i: number) => i !== lIdx);
                        handleJsonContentChange('categories', newCats);
                      }}
                      className="absolute -left-5 top-1 text-red-400 hover:text-red-600 opacity-0 group-hover/link:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                      <Input className="h-7 text-[10px]" value={link.text} onChange={(e) => updateLink(cIdx, lIdx, 'text', e.target.value)} placeholder="Text" />
                      <Input className="h-7 text-[10px]" value={link.url} onChange={(e) => updateLink(cIdx, lIdx, 'url', e.target.value)} placeholder="URL" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t">
          <PropertyInput label="Global Redirect URL" value={content.linkUrl} onChange={(v: string) => handleJsonContentChange('linkUrl', v)} placeholder="https://..." />
          <PropertyInput label="Button Redirect URL" value={content.buttonUrl} onChange={(v: string) => handleJsonContentChange('buttonUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  return null;
};
