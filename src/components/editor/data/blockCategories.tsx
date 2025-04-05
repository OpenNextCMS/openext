import { LayoutGrid, Type, Heading2 } from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

// Helper type for block categories that use ReactNode for icon
type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

const commonBlockStyle = {
  padding: '16px',
  border: '1px solid rgb(229, 231, 235)', // Tailwind's border color
  borderRadius: '8px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease-in-out',
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
      style: commonBlockStyle,
    },
    {
      id: '2-column',
      label: '2 Column Layout',
      type: 'column',
      children: [[], []],
      content: '',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
      description: 'Two equal width columns',
      style: commonBlockStyle,
    },
    {
      id: '3-column',
      label: '3 Column Layout',
      type: 'column',
      children: [[], [], []],
      content: '',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
      description: 'Three equal width columns',
      style: commonBlockStyle,
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
      style: commonBlockStyle,
    },
    {
      id: 'heading',
      label: 'Heading Block',
      type: 'text',
      content: 'Heading Block',
      icon: <Heading2 className="h-4 w-4 mr-2 text-primary" />,
      description: 'Section heading',
      style: commonBlockStyle,
    },
  ],
};
