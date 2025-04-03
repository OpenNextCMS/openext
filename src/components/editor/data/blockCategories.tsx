import { LayoutGrid, Type, Heading2, Image as ImageIcon } from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

// Helper type for block categories that use ReactNode for icon
type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

export const blockCategories: Record<string, BlockWithReactNodeIcon[]> = {
  layout: [
    {
      id: '1-column',
      label: '1 Column Layout',
      type: 'column',
      children: [[]],
      content: '',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
      description: 'Single column layout',
    },
    {
      id: '2-column',
      label: '2 Column Layout',
      type: 'column',
      children: [[], []],
      content: '',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
      description: 'Two equal width columns',
    },
    {
      id: '3-column',
      label: '3 Column Layout',
      type: 'column',
      children: [[], [], []],
      content: '',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
      description: 'Three equal width columns',
    },
  ],
  content: [
    {
      id: 'text',
      label: 'Text Block',
      type: 'text',
      content: 'Demo Data for Text Block',
      icon: <Type className="h-4 w-4 mr-2 text-primary" />,
      description: 'Regular paragraph text',
    },
    {
      id: 'heading',
      label: 'Heading Block',
      type: 'text',
      content: 'Heading Block',
      icon: <Heading2 className="h-4 w-4 mr-2 text-primary" />,
      description: 'Section heading',
    },
    {
      id: 'image',
      label: 'Image Block',
      type: 'text',
      content: 'Image Placeholder',
      icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" aria-hidden="true" />,
      description: 'Image with caption',
    },
  ],
};
