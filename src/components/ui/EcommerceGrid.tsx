import React from 'react';

import { InlineEditableText } from '@/components/editor/InlineEditableText';
import type { BlockRendererProps } from '@/types/index';
import type { BlockContentItem } from '@/types/blockContent';
import { useAppDispatch } from '@/redux/hooks';
import { updateBlockContent } from '@/redux/canvasSlice';

export const EcommerceGrid = ({ block, isEditing = false }: BlockRendererProps) => {
  const dispatch = useAppDispatch();
  const content = React.useMemo(() => {
    try {
      return typeof block.content === 'string' && block.content.startsWith('{')
        ? JSON.parse(block.content)
        : {};
    } catch {
      return {};
    }
  }, [block.content]);

  const handleUpdate = (key: string, newValue: unknown) => {
    if (!isEditing) return;
    const updatedContent = { ...content, [key]: newValue };
    dispatch(
      updateBlockContent({
        id: block.uniqueId ?? '',
        content: JSON.stringify(updatedContent),
      })
    );
  };

  const updateProduct = (index: number, key: string, value: string) => {
    if (!isEditing) return;
    const currentProducts = [...products];
    currentProducts[index] = { ...currentProducts[index], [key]: value };
    handleUpdate('products', currentProducts);
  };

  const products = content.products || [
    { image: 'https://dummyimage.com/420x260', category: 'CATEGORY', title: 'The Catalyzer', price: '$16.00' },
    { image: 'https://dummyimage.com/421x261', category: 'CATEGORY', title: 'Shooting Stars', price: '$21.15' },
    { image: 'https://dummyimage.com/422x262', category: 'CATEGORY', title: 'Neptune', price: '$12.00' },
    { image: 'https://dummyimage.com/423x263', category: 'CATEGORY', title: 'The 400 Blows', price: '$18.40' },
    { image: 'https://dummyimage.com/424x264', category: 'CATEGORY', title: 'The Catalyzer', price: '$16.00' },
    { image: 'https://dummyimage.com/425x265', category: 'CATEGORY', title: 'Shooting Stars', price: '$21.15' },
    { image: 'https://dummyimage.com/427x267', category: 'CATEGORY', title: 'Neptune', price: '$12.00' },
    { image: 'https://dummyimage.com/428x268', category: 'CATEGORY', title: 'The 400 Blows', price: '$18.40' },
  ];

  return (
    <section className="text-gray-600 body-font w-full" style={block.style}>
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -m-4">
          {products.map((product: BlockContentItem, index: number) => (
            <div key={index} className="lg:w-1/4 md:w-1/2 p-4 w-full">
              <a className="block relative h-48 rounded overflow-hidden">
                <img alt="ecommerce" className="object-cover object-center w-full h-full block" src={product.image} />
              </a>
              <div className="mt-4">
                <InlineEditableText
                  tagName="h3"
                  value={product.category || 'CATEGORY'}
                  onBlur={(v) => updateProduct(index, 'category', v)}
                  isEditing={isEditing}
                  className="text-gray-500 text-xs tracking-widest title-font mb-1"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.productCategoryStyle 
                  }}
                />
                <InlineEditableText
                  tagName="h2"
                  value={product.title || 'Product Title'}
                  onBlur={(v) => updateProduct(index, 'title', v)}
                  isEditing={isEditing}
                  className="text-gray-900 title-font text-lg font-medium"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.productTitleStyle 
                  }}
                />
                <InlineEditableText
                  tagName="p"
                  value={product.price || '$0.00'}
                  onBlur={(v) => updateProduct(index, 'price', v)}
                  isEditing={isEditing}
                  className="mt-1"
                  style={{ 
                    color: block.style?.color, 
                    fontFamily: block.style?.fontFamily,
                    ...content.productPriceStyle 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
