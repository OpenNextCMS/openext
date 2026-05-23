import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PropertyInput } from './PropertyInput';
import { PropertyImageInput } from './PropertyImageInput';

export const EcommerceCustomProperties = ({ type, content, handleJsonContentChange, handleImageUpload, isUploadingImage }: any) => {
  if (type === 'ecommerce-grid') {
    const products = Array.isArray(content.products) ? content.products : [];

    const updateProduct = (index: number, key: string, value: any) => {
      const updatedProducts = [...products];
      updatedProducts[index] = { ...updatedProducts[index], [key]: value };
      handleJsonContentChange('products', updatedProducts);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-primary uppercase">Product List</Label>
          <button
            onClick={() => {
              const newProducts = [...products, { image: 'https://dummyimage.com/420x260', category: 'CATEGORY', title: 'New Product', price: '$0.00' }];
              handleJsonContentChange('products', newProducts);
            }}
            className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90"
          >
            Add Product
          </button>
        </div>
        <div className="space-y-4">
          {products.map((product: any, index: number) => (
            <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/5 relative group">
              <button
                onClick={() => {
                  const newProducts = products.filter((_: any, i: number) => i !== index);
                  handleJsonContentChange('products', newProducts);
                }}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
              <Label className="text-[10px] font-semibold">Product #{index + 1}</Label>
              <PropertyImageInput 
                label="Image" 
                value={product.image} 
                onChange={(v) => updateProduct(index, 'image', v)} 
                onUpload={handleImageUpload} 
                isUploading={isUploadingImage} 
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'ecommerce-detail' || type === 'ecommerce-info') {
    return (
      <div className="space-y-4">
        <PropertyImageInput label="Product Image" value={content.image} onChange={(v) => handleJsonContentChange('image', v)} onUpload={handleImageUpload} isUploading={isUploadingImage} />
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-[11px] font-bold text-primary uppercase">Redirect URL</Label>
          <PropertyInput label="Button URL" value={content.buttonUrl} onChange={(v: string) => handleJsonContentChange('buttonUrl', v)} placeholder="https://..." />
        </div>
      </div>
    );
  }

  return null;
};
