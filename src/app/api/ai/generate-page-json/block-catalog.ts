import type { CSSProperties } from 'react';
import type { BlockData } from '@/types';

export interface AiEditorBlock {
  id: string;
  label: string;
  type: BlockData['type'];
  description: string;
  content: string;
  style: CSSProperties;
  childrenColumns?: number;
}

const commonLayoutStyle: CSSProperties = {
  padding: '16px',
  border: '1px solid rgb(229, 231, 235)',
  borderRadius: '8px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.2s ease-in-out',
};

export const aiEditorBlocks: AiEditorBlock[] = [
  {
    id: 'row',
    label: 'Row Layout',
    type: 'row',
    description: 'Flex row layout for blocks',
    content: '',
    childrenColumns: 2,
    style: {
      ...commonLayoutStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: '1-column',
    label: '1 Column Layout',
    type: 'column',
    description: 'Single column layout',
    content: '',
    childrenColumns: 1,
    style: {
      ...commonLayoutStyle,
      display: 'flex',
      flexDirection: 'column',
    },
  },
  {
    id: '2-column',
    label: '2 Column Layout',
    type: 'column',
    description: 'Two equal width columns',
    content: '',
    childrenColumns: 2,
    style: {
      ...commonLayoutStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: '3-column',
    label: '3 Column Layout',
    type: 'column',
    description: 'Three equal width columns',
    content: '',
    childrenColumns: 3,
    style: {
      ...commonLayoutStyle,
      display: 'flex',
      flexDirection: 'row',
    },
  },
  {
    id: 'nav-bar',
    label: 'Nav Bar',
    type: 'nav-bar',
    description: 'Navigation bar with logo and links',
    content: JSON.stringify({
      logo: 'Brand',
      logoType: 'text',
      logoSource: 'custom',
      logoImage: '',
      layout: 'horizontal',
      links: [
        { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
      ],
    }),
    style: {
      width: '100%',
      backgroundColor: '#ffffff',
    },
  },
  {
    id: 'text',
    label: 'Text Block',
    type: 'text',
    description: 'Regular paragraph text',
    content: 'Demo Data for Text Block',
    style: {
      padding: '25px 20px 25px 20px',
      margin: '5px 2px 5px 2px',
      display: 'flex',
      justifyContent: 'flex-start',
      textAlign: 'right',
      textTransform: 'lowercase',
    },
  },
  {
    id: 'heading',
    label: 'Heading Block',
    type: 'text',
    description: 'Section heading',
    content: 'Heading Block',
    style: {
      padding: '50px 50px 75px 100px',
      margin: '5px 2px 5px 2px',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: 'Arial',
      fontSize: '24px',
      fontWeight: '600',
      fontStyle: 'italic',
      lineHeight: '1',
      letterSpacing: '1px',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  },
  {
    id: 'stats',
    label: 'Stats Block',
    type: 'stats',
    description: 'Statistical counter with label',
    content: JSON.stringify({ value: '200+', label: 'Project Delivered' }),
    style: {
      backgroundColor: '#1f2937',
      padding: '20px',
      borderRadius: '8px',
    },
  },
  {
    id: 'progress',
    label: 'Progress Bar',
    type: 'progress',
    description: 'Animated progress bar with percentage',
    content: JSON.stringify({ label: 'Delivery Rate', percentage: 100 }),
    style: {
      marginBottom: '10px',
    },
  },
  {
    id: 'countdown',
    label: 'Countdown Timer',
    type: 'countdown',
    description: 'Timer with days, hours, mins, secs',
    content: JSON.stringify({ days: '0', hours: '00', minutes: '00', seconds: '00' }),
    style: {
      padding: '20px',
    },
  },
  {
    id: 'button',
    label: 'Button',
    type: 'button',
    description: 'Call to action button',
    content: 'Click Me',
    style: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: '4px',
      padding: '8px 16px',
      fontWeight: '500',
    },
  },
  {
    id: 'icon',
    label: 'Icon Block',
    type: 'icon',
    description: 'Standalone decorative or feature icon',
    content: 'sparkles',
    style: {
      color: '#ffffff',
      width: '96px',
      height: '96px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  {
    id: 'input',
    label: 'Input Box',
    type: 'input',
    description: 'Input field for website visitor text',
    content: JSON.stringify({
      label: 'Your Name',
      placeholder: 'Enter your name',
      name: 'your_name',
      inputType: 'text',
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginBottom: '6px',
        textAlign: 'left',
      },
    }),
    style: {
      width: '100%',
      padding: '12px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'radio',
    label: 'Radio Button',
    type: 'radio',
    description: 'Single radio option for website visitor selection',
    content: JSON.stringify({
      label: 'Radio option',
      name: 'radio_group',
      value: 'radio_option',
      checked: false,
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '8px',
        textAlign: 'left',
      },
    }),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'checkbox',
    label: 'Check Button',
    type: 'checkbox',
    description: 'Checkbox field for website visitor confirmation',
    content: JSON.stringify({
      label: 'I agree',
      name: 'agreement',
      value: 'yes',
      checked: false,
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '8px',
        textAlign: 'left',
      },
    }),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'avatar',
    label: 'Avatar',
    type: 'avatar',
    description: 'Reusable UI avatar',
    content: JSON.stringify({ src: '', alt: 'User avatar', fallback: 'AT' }),
    style: {
      width: '48px',
      height: '48px',
    },
  },
  {
    id: 'separator',
    label: 'Separator',
    type: 'separator',
    description: 'Reusable UI separator line',
    content: JSON.stringify({ orientation: 'horizontal' }),
    style: {
      width: '100%',
      height: '1px',
    },
  },
  {
    id: 'skeleton',
    label: 'Skeleton',
    type: 'skeleton',
    description: 'Reusable UI loading placeholder',
    content: JSON.stringify({ label: '' }),
    style: {
      width: '100%',
      height: '48px',
    },
  },
  {
    id: 'switch',
    label: 'Switch',
    type: 'switch',
    description: 'Reusable UI switch control',
    content: JSON.stringify({
      label: 'Enable option',
      name: 'enable_option',
      checked: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '10px',
      },
    }),
    style: {
      display: 'flex',
      alignItems: 'center',
    },
  },
  {
    id: 'textarea',
    label: 'Textarea',
    type: 'textarea',
    description: 'Reusable UI textarea input',
    content: JSON.stringify({
      label: 'Message',
      placeholder: 'Enter your message',
      name: 'message',
      value: '',
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginBottom: '6px',
      },
    }),
    style: {
      width: '100%',
      minHeight: '120px',
    },
  },
  {
    id: 'table',
    label: 'Table',
    type: 'table',
    description: 'Reusable UI table',
    content: JSON.stringify({
      caption: 'Service overview',
      headers: ['Service', 'Timeline', 'Status'],
      rows: [
        ['Website', '2 weeks', 'Active'],
        ['Mobile App', '4 weeks', 'Planned'],
      ],
    }),
    style: {
      width: '100%',
    },
  },
  {
    id: 'tabs',
    label: 'Tabs',
    type: 'tabs',
    description: 'Reusable UI tabs',
    content: JSON.stringify({
      defaultValue: 'overview',
      tabs: [
        { value: 'overview', label: 'Overview', content: 'Overview content goes here.' },
        { value: 'details', label: 'Details', content: 'Details content goes here.' },
      ],
    }),
    style: {
      width: '100%',
    },
  },
  {
    id: 'image',
    label: 'Image Block',
    type: 'image',
    description: 'Responsive image with alt text and optional caption',
    content: JSON.stringify({ src: '', alt: 'Image', caption: '' }),
    style: {
      width: '100%',
      height: '220px',
      borderRadius: '8px',
    },
  },
  {
    id: 'card',
    label: 'Card Block',
    type: 'card',
    description: 'Image, title, text, and call-to-action card',
    content: JSON.stringify({
      image: '',
      eyebrow: 'Platform',
      title: 'Web Development',
      body: 'Build responsive sections with reusable editor elements.',
      buttonText: 'Read More',
    }),
    style: {
      backgroundColor: '#ffffff',
      color: '#111827',
      borderRadius: '8px',
    },
  },
  {
    id: 'shape-divider',
    label: 'Shape Divider',
    type: 'shape-divider',
    description: 'Wave, curve, or tilted section divider',
    content: JSON.stringify({ shape: 'wave', color: '#ffffff', height: 120, flip: false }),
    style: {
      width: '100%',
    },
  },
];

export const aiEditorBlockIds = new Set(aiEditorBlocks.map((block) => block.id));
export const aiEditorBlockTypes = new Set<BlockData['type']>(
  aiEditorBlocks.map((block) => block.type)
);

export const aiEditorBlocksById = new Map(aiEditorBlocks.map((block) => [block.id, block]));

export const aiEditorBlocksByType = aiEditorBlocks.reduce<
  Partial<Record<BlockData['type'], AiEditorBlock>>
>((blocksByType, block) => {
  if (block.type !== 'text' && block.type !== 'column' && block.type !== 'row') {
    blocksByType[block.type] = block;
  }

  return blocksByType;
}, {});

export const aiEditorBlockPromptCatalog = JSON.stringify(
  aiEditorBlocks.map((block) => ({
    id: block.id,
    label: block.label,
    type: block.type,
    description: block.description,
    childrenColumns: block.childrenColumns || 0,
    defaultContent: block.content,
    defaultStyle: block.style,
  })),
  null,
  2
);

<<<<<<< HEAD
// Hello Saurav
=======
// Hello Saurav
>>>>>>> khadija
