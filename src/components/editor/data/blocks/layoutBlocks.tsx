import React from 'react';
import { LayoutGrid, PanelTop } from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

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

export const layoutBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'row',
    label: 'Row Layout',
    type: 'row',
    children: [[], []],
    content: '',
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Flex row layout for blocks',
    style: {
      ...commonBlockStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: '1-column',
    label: '1 Column Layout',
    type: 'column',
    children: [[]],
    content: '',
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Single column layout',
    style: {
      ...commonBlockStyle,
      display: 'flex',
      flexDirection: 'column',
    },
  },
  {
    id: '2-column',
    label: '2 Column Layout',
    type: 'column',
    children: [[], []],
    content: '',
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Two equal width columns',
    style: {
      ...commonBlockStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: '3-column',
    label: '3 Column Layout',
    type: 'column',
    children: [[], [], []],
    content: '',
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Three equal width columns',
    style: {
      ...commonBlockStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: 'nav-bar',
    label: 'Nav Bar',
    type: 'nav-bar',
    content: JSON.stringify({
      logo: 'Brand',
      logoType: 'text',
      logoImage: '',
      links: [
        { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
      ],
    }),
    icon: <PanelTop className="h-4 w-4 mr-2 text-primary" />,
    description: 'Navigation bar with logo and links',
    style: {
      width: '100%',
      backgroundColor: '#ffffff',
    },
  },
];
