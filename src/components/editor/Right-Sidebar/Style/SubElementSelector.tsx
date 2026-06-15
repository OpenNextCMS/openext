'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setSelectedPart, updateBlockContent } from '@/redux/canvasSlice';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
<<<<<<< HEAD
import { Button } from '@/components/ui/button';
import { MousePointerClick, X } from 'lucide-react';
import { prettyPartLabel } from '@/lib/editor/stylePath';
=======
>>>>>>> khadija

const subElementMap: Record<string, { label: string; value: string; contentKey?: string }[]> = {
  'contact': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Email Label', value: 'emailLabelStyle', contentKey: 'emailLabel' },
    { label: 'Message Label', value: 'messageLabelStyle', contentKey: 'messageLabel' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
    { label: 'Footer', value: 'footerStyle', contentKey: 'footerText' },
  ],
  'contact-simple': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Name Label', value: 'nameLabelStyle', contentKey: 'nameLabel' },
    { label: 'Email Label', value: 'emailLabelStyle', contentKey: 'emailLabel' },
    { label: 'Message Label', value: 'messageLabelStyle', contentKey: 'messageLabel' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
    { label: 'Email Value', value: 'emailStyle', contentKey: 'email' },
    { label: 'Address', value: 'addressStyle', contentKey: 'address' },
    { label: 'City/State', value: 'cityStyle', contentKey: 'city' },
  ],
  'hero-main': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Primary Button', value: 'primaryButtonStyle', contentKey: 'primaryButtonText' },
    { label: 'Secondary Button', value: 'secondaryButtonStyle', contentKey: 'secondaryButtonText' },
  ],
  'hero-centered': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Primary Button', value: 'primaryButtonStyle', contentKey: 'primaryButtonText' },
    { label: 'Secondary Button', value: 'secondaryButtonStyle', contentKey: 'secondaryButtonText' },
  ],
  'content-features': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Eyebrow', value: 'eyebrowStyle', contentKey: 'eyebrow' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'content-gallery': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Item Title', value: 'itemTitleStyle' },
    { label: 'Item Subtitle', value: 'itemSubtitleStyle' },
    { label: 'Item Description', value: 'itemDescriptionStyle' },
  ],
  'content-detail': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Author Name', value: 'authorNameStyle', contentKey: 'authorName' },
    { label: 'Author Bio', value: 'authorBioStyle', contentKey: 'authorBio' },
    { label: 'Main Text', value: 'mainTextStyle', contentKey: 'mainText' },
  ],
  'content-categories': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Link Text', value: 'linkTextStyle', contentKey: 'linkText' },
    { label: 'Category Heading', value: 'categoryHeadingStyle', contentKey: 'categoryHeading' },
    { label: 'Link Item', value: 'linkItemStyle' },
  ],
  'content-icons': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'content-split': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Left Title', value: 'leftTitleStyle' },
    { label: 'Left Description', value: 'leftDescriptionStyle' },
    { label: 'Left Button', value: 'leftButtonStyle' },
    { label: 'Right Title', value: 'rightTitleStyle' },
    { label: 'Right Description', value: 'rightDescriptionStyle' },
    { label: 'Right Button', value: 'rightButtonStyle' },
  ],
  'content-trio': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Item Title', value: 'itemTitleStyle' },
    { label: 'Item Description', value: 'itemDescriptionStyle' },
  ],
  'statistics-main': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Value (Number)', value: 'valueStyle' },
    { label: 'Label (Text)', value: 'labelStyle' },
  ],
  'statistics-side-image': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Value (Number)', value: 'valueStyle' },
    { label: 'Label (Text)', value: 'labelStyle' },
  ],
  'statistics-boxed': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Value (Number)', value: 'valueStyle' },
    { label: 'Label (Text)', value: 'labelStyle' },
  ],
  'ecommerce-grid': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Product Title', value: 'productTitleStyle' },
    { label: 'Product Category', value: 'productCategoryStyle' },
    { label: 'Product Price', value: 'productPriceStyle' },
  ],
  'ecommerce-detail': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Brand', value: 'brandStyle', contentKey: 'brand' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Price', value: 'priceStyle', contentKey: 'price' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'ecommerce-info': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Brand', value: 'brandStyle', contentKey: 'brand' },
    { label: 'Title', value: 'titleStyle', contentKey: 'title' },
    { label: 'Description', value: 'descriptionStyle', contentKey: 'description' },
    { label: 'Price', value: 'priceStyle', contentKey: 'price' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'feature-trio': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
  ],
  'feature-vertical': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'feature-side-image': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
  ],
  'feature-horizontal': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
  ],
  'feature-boxed': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Eyebrow', value: 'eyebrowStyle', contentKey: 'eyebrow' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
  ],
  'feature-zigzag': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Feature Item Title', value: 'featureTitleStyle' },
    { label: 'Feature Item Description', value: 'featureDescriptionStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'feature-checklist': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Item Text', value: 'itemTextStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'feature-list': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Main Description', value: 'mainDescriptionStyle', contentKey: 'mainDescription' },
    { label: 'Category Title', value: 'categoryTitleStyle' },
    { label: 'Link Text', value: 'linkTextStyle' },
    { label: 'Button', value: 'buttonStyle', contentKey: 'buttonText' },
  ],
  'testimonial-main': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Main Title', value: 'mainTitleStyle', contentKey: 'mainTitle' },
    { label: 'Quote Text', value: 'quoteStyle' },
    { label: 'Name', value: 'nameStyle' },
    { label: 'Role', value: 'roleStyle' },
  ],
  'testimonial-single': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Quote Text', value: 'quoteStyle', contentKey: 'text' },
    { label: 'Name', value: 'nameStyle', contentKey: 'name' },
    { label: 'Role', value: 'roleStyle', contentKey: 'role' },
  ],
  'testimonial-single-large': [
    { label: 'Entire Block', value: 'root' },
    { label: 'Quote Text', value: 'quoteStyle', contentKey: 'text' },
    { label: 'Name', value: 'nameStyle', contentKey: 'name' },
    { label: 'Role', value: 'roleStyle', contentKey: 'role' },
  ],
};

export default function SubElementSelector() {
  const dispatch = useAppDispatch();
  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const selectedPart = useAppSelector((state) => state.canvas.selectedPart);

  if (!selectedBlock) return null;

  const subElements = subElementMap[selectedBlock.type];
<<<<<<< HEAD

  // A per-item element selected by clicking on the canvas — its value is not in
  // the (text-only) dropdown map. Show a banner + reset instead.
  const isClickSelectedElement =
    !!selectedPart && (selectedPart.includes('.') || !subElements?.some((p) => p.value === selectedPart));

  // Nothing to show for this block type and no click-selected element.
  if (!subElements && !isClickSelectedElement) return null;

  const currentPart =
    subElements?.find((p) => p.value === (selectedPart || 'root')) || subElements?.[0];

  const handleContentChange = (newText: string) => {
    if (!currentPart?.contentKey) return;
=======
  if (!subElements) return null;

  const currentPart = subElements.find(p => p.value === (selectedPart || 'root')) || subElements[0];

  const handleContentChange = (newText: string) => {
    if (!currentPart.contentKey) return;
>>>>>>> khadija
    try {
      const content = JSON.parse(selectedBlock.content);
      content[currentPart.contentKey] = newText;
      dispatch(updateBlockContent({ id: selectedBlock.uniqueId, content: JSON.stringify(content) }));
    } catch (e) {
      console.error('Failed to update content from style tab:', e);
    }
  };

  const getContentValue = () => {
<<<<<<< HEAD
    if (!currentPart?.contentKey) return '';
=======
    if (!currentPart.contentKey) return '';
>>>>>>> khadija
    try {
      const content = JSON.parse(selectedBlock.content);
      return content[currentPart.contentKey] || '';
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-3 pb-3 border-b mb-3">
<<<<<<< HEAD
      {/* Click-selected per-item element (card/icon/image/button) */}
      {isClickSelectedElement ? (
        <div className="rounded-md border bg-muted/40 p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            Editing element
          </div>
          <div className="text-sm font-semibold">{prettyPartLabel(selectedPart)}</div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-full text-xs"
            onClick={() => dispatch(setSelectedPart(null))}
          >
            <X className="mr-1 h-3 w-3" /> Select entire block
          </Button>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Tip: click any card, icon, image or button on the canvas to style it
            individually.
          </p>
        </div>
      ) : (
        subElements && (
          <>
            <SelectComp
              label="Edit Element"
              value={selectedPart || 'root'}
              onValueChange={(val) => dispatch(setSelectedPart(val === 'root' ? null : val))}
              options={subElements.map((p) => ({ label: p.label, value: p.value }))}
            />

            {selectedPart && currentPart?.contentKey && (
              <div className="space-y-1.5">
                <Label className="text-xs">Element Content</Label>
                <Input
                  className="h-8 text-sm"
                  value={getContentValue()}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter text content..."
                />
              </div>
            )}
          </>
        )
=======
      <SelectComp
        label="Edit Element"
        value={selectedPart || 'root'}
        onValueChange={(val) => dispatch(setSelectedPart(val === 'root' ? null : val))}
        options={subElements.map(p => ({ label: p.label, value: p.value }))}
      />

      {selectedPart && currentPart.contentKey && (
        <div className="space-y-1.5">
          <Label className="text-xs">Element Content</Label>
          <Input
            className="h-8 text-sm"
            value={getContentValue()}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Enter text content..."
          />
        </div>
>>>>>>> khadija
      )}
    </div>
  );
}
