import { LayoutGrid, Type, Heading2 } from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

// Helper type for block categories that use ReactNode for icon
type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

const commonBlockStyle = {
  padding: '16px',
  border: '1px solid rgb(229, 231, 235)',
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
      style: {
        padding: '25px 20px 25px 20px',
        margin: '5px 2px 5px 2px',
        border: '5px solid rgb(6, 28, 70)',
        // borderRadius: '8px',
        boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
        textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        justifyContent: 'flex-start',
        textAlign: 'right',
        backgroundColor: 'rgb(228, 27, 64)',
        textTransform: 'lowercase',
      },
    },
    {
      id: 'heading',
      label: 'Heading Block',
      type: 'text',
      content: 'Heading Block',
      icon: <Heading2 className="h-4 w-4 mr-2 text-primary" />,
      description: 'Section  heading',
      style: {
        padding: '50px 50px 75px 100px',
        margin: '5px 2px 5px 2px',
        border: '3px dashed rgb(255, 0, 0)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: 'rgb(203, 180, 180)',

        fontFamily: 'Arial',
        fontSize: '24px',
        fontWeight: '600',
        fontStyle: 'italic',
        lineHeight: '1',
        letterSpacing: '1px',
        textAlign: 'center',
        textTransform: 'uppercase',
        textDecoration: 'underline',

        position: 'relative',
        top: '10px',
        right: '0px',
        bottom: '0px',
        left: '0px',
        zIndex: '2',
      },
    },
  ],
};
