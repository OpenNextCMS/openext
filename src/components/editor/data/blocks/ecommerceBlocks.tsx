import React from 'react';
import {
  LayoutGrid,
  PanelTop,
} from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

export const ecommerceBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'ecommerce-grid',
    label: 'Product Grid',
    type: 'ecommerce-grid',
    content: JSON.stringify({
      products: [
        { image: 'https://dummyimage.com/420x260', category: 'CATEGORY', title: 'The Catalyzer', price: '$16.00' },
        { image: 'https://dummyimage.com/421x261', category: 'CATEGORY', title: 'Shooting Stars', price: '$21.15' },
        { image: 'https://dummyimage.com/422x262', category: 'CATEGORY', title: 'Neptune', price: '$12.00' },
        { image: 'https://dummyimage.com/423x263', category: 'CATEGORY', title: 'The 400 Blows', price: '$18.40' },
      ]
    }),
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Grid of products for e-commerce',
    style: {
      width: '100%',
    },
  },
  {
    id: 'ecommerce-detail',
    label: 'Product Detail',
    type: 'ecommerce-detail',
    content: JSON.stringify({
      image: 'https://dummyimage.com/400x400',
      brand: 'BRAND NAME',
      title: 'The Catcher in the Rye',
      price: '$58.00',
      reviews: '4 Reviews',
      description: 'Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam indxgo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean shorts keytar banjo tattooed umami cardigan.',
      buttonText: 'Buy Now'
    }),
    icon: <PanelTop className="h-4 w-4 mr-2 text-primary" />,
    description: 'Full product detail view',
    style: {
      width: '100%',
    },
  },
  {
    id: 'ecommerce-info',
    label: 'Product Info',
    type: 'ecommerce-info',
    content: JSON.stringify({
      image: 'https://dummyimage.com/400x400',
      brand: 'BRAND NAME',
      title: 'Animated Night Hill Illustrations',
      price: '$58.00',
      description: 'Fam locavore kickstarter distillery. Mixtape chillwave tumeric sriracha taximy chia microdosing tilde DIY. XOXO fam indxgo juiceramps cornhole raw denim forage brooklyn. Everyday carry +1 seitan poutine tumeric. Gastropub blue bottle austin listicle pour-over, neutra jean.',
      color: 'Blue',
      size: 'Medium',
      quantity: '4',
      buttonText: 'Buy Now'
    }),
    icon: <PanelTop className="h-4 w-4 mr-2 text-primary" />,
    description: 'Product info with tabs and image',
    style: {
      width: '100%',
    },
  },
];
