'use client';

import { useEffect, useState } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SelectComp from '@/components/ReusableComponents/SelectComp';
import InputSelect from '@/components/ReusableComponents/SizeInput';
import { Label } from '@/components/ui/label';
import { useAppSelector, useAppDispatch } from '@/redux/hooks';
import { updateSelectedBlockStyles } from '@/redux/canvasSlice'; // 👈 Update this path to your actual action

export default function Typography() {
  const dispatch = useAppDispatch();
  const [fontOpen, setFontOpen] = useState(false);

  const selectedBlock = useAppSelector((state) => state.canvas.selectedBlock);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState('16');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [fontWeight, setFontWeight] = useState('400');
  const [fontStyle, setFontStyle] = useState('normal');
  const [letterSpacing, setLetterSpacing] = useState('0');
  const [textAlign, setTextAlign] = useState('left');
  const [textTransform, setTextTransform] = useState('none');
  const [textDecoration, setTextDecoration] = useState('none');

  // Update local state when block changes
  useEffect(() => {
    const style = selectedBlock?.style || {};
    setFontFamily(String(style.fontFamily || 'Arial').replace(/['"]/g, ''));
    setFontSize(String(style.fontSize || '16').replace(/[^0-9.]/g, ''));
    setLineHeight(String(style.lineHeight || '1.5').replace(/[^0-9.]/g, ''));
    setFontWeight(String(style.fontWeight || '400'));
    setFontStyle(String(style.fontStyle || 'normal'));
    setLetterSpacing(String(style.letterSpacing || '0').replace(/[^0-9.]/g, ''));
    setTextAlign(String(style.textAlign || 'left'));
    setTextTransform(String(style.textTransform || 'none'));
    setTextDecoration(String(style.textDecoration || 'none'));
  }, [selectedBlock]);

  // Generic handler to update style
  const handleStyleChange = (property: string, value: string) => {
    dispatch(updateSelectedBlockStyles({ [property]: value }));
  };

  return (
    <Collapsible open={fontOpen} onOpenChange={setFontOpen} className="rounded-lg border">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
              {fontOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium text-sm">Typography</span>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-3">
          <SelectComp
            label="Font Family"
            value={fontFamily}
            onValueChange={(val) => {
              setFontFamily(val);
              handleStyleChange('fontFamily', val);
            }}
            options={[
              { label: 'Arial', value: 'Arial' },
              { label: 'Helvetica', value: 'Helvetica' },
              { label: 'Times New Roman', value: 'Times New Roman' },
              { label: 'Courier New', value: 'Courier New' },
            ]}
          />

          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Font Size</Label>
            <InputSelect
              value={fontSize}
              onValueChange={(val) => {
                setFontSize(val);
                handleStyleChange('fontSize', `${val}px`);
              }}
              unitValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Line Height</Label>
            <InputSelect
              value={lineHeight}
              onValueChange={(val) => {
                setLineHeight(val);
                handleStyleChange('lineHeight', val);
              }}
              unitValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
                { label: '%', value: '%' },
              ]}
            />
          </div>

          <SelectComp
            label="Font Weight"
            value={fontWeight}
            onValueChange={(val) => {
              setFontWeight(val);
              handleStyleChange('fontWeight', val);
            }}
            options={[
              { label: 'Light (300)', value: '300' },
              { label: 'Regular (400)', value: '400' },
              { label: 'Medium (500)', value: '500' },
              { label: 'Semibold (600)', value: '600' },
              { label: 'Bold (700)', value: '700' },
            ]}
          />

          <SelectComp
            label="Font Style"
            value={fontStyle}
            onValueChange={(val) => {
              setFontStyle(val);
              handleStyleChange('fontStyle', val);
            }}
            options={[
              { label: 'Normal', value: 'normal' },
              { label: 'Italic', value: 'italic' },
            ]}
          />

          <div className="flex items-center gap-2">
            <Label className="text-xs w-16">Letter Spacing</Label>
            <InputSelect
              value={letterSpacing}
              onValueChange={(val) => {
                setLetterSpacing(val);
                handleStyleChange('letterSpacing', `${val}px`);
              }}
              unitValue="px"
              options={[
                { label: 'px', value: 'px' },
                { label: 'rem', value: 'rem' },
              ]}
            />
          </div>

          <SelectComp
            label="Text Align"
            value={textAlign}
            onValueChange={(val) => {
              setTextAlign(val);
              handleStyleChange('textAlign', val);
            }}
            options={[
              { label: 'Left', value: 'left' },
              { label: 'Center', value: 'center' },
              { label: 'Right', value: 'right' },
              { label: 'Justify', value: 'justify' },
            ]}
          />

          <SelectComp
            label="Text Transform"
            value={textTransform}
            onValueChange={(val) => {
              setTextTransform(val);
              handleStyleChange('textTransform', val);
            }}
            options={[
              { label: 'None', value: 'none' },
              { label: 'Capitalize', value: 'capitalize' },
              { label: 'Uppercase', value: 'uppercase' },
              { label: 'Lowercase', value: 'lowercase' },
            ]}
          />

          <div className="space-y-1.5">
            <Label className="text-xs">Text Decoration</Label>
            <div className="grid grid-cols-2 gap-2">
              {['none', 'underline', 'line-through'].map((val) => (
                <Button
                  key={val}
                  variant={textDecoration === val ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={() => {
                    setTextDecoration(val);
                    handleStyleChange('textDecoration', val);
                  }}
                >
                  <span
                    className={
                      val === 'underline'
                        ? 'underline'
                        : val === 'line-through'
                          ? 'line-through'
                          : ''
                    }
                  >
                    {val === 'line-through'
                      ? 'Strikethrough'
                      : val.charAt(0).toUpperCase() + val.slice(1)}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
