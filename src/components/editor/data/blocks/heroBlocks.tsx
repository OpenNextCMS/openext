import React from 'react';
import {
  Image as ImageIcon,
} from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

export const heroBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'hero-main',
    label: 'Hero Main',
    type: 'hero-main',
    content: JSON.stringify({
      title: 'Before they sold out\nreadymade gluten',
      description: 'Copper mug try-hard pitchfork pour-over freegan heirloom neutra air plant cold-pressed tacos poke beard tote bag. Heirloom echo park mlkshk tote bag selvage hot chicken authentic tumeric truffaut hexagon try-hard chambray.',
      primaryButtonText: 'Primary Action',
      secondaryButtonText: 'Secondary Action',
      image: 'https://dummyimage.com/720x600'
    }),
    icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" />,
    description: 'Split hero with text and image',
    style: {
      width: '100%',
    },
  },
  {
    id: 'hero-centered',
    label: 'Hero Centered',
    type: 'hero-centered',
    content: JSON.stringify({
      title: 'Microdosing synth tattooed vexillologist',
      description: 'Meggings kinfolk echo park stumptown DIY, kale chips beard jianbing tousled. Chambray dreamcatcher trust fund, kitsch vice godard disrupt ramps hexagon mustache umami snackwave tilde chillwave ugh. Pour-over meditation PBR&B pickled ennui celiac mlkshk freegan photo booth af fingerstache pitchfork.',
      primaryButtonText: 'Primary Action',
      secondaryButtonText: 'Secondary Action',
      image: 'https://dummyimage.com/720x600'
    }),
    icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" />,
    description: 'Centered hero with image and text',
    style: {
      width: '100%',
    },
  },
];
