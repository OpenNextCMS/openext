import { layoutBlocks } from './blocks/layoutBlocks';
import { contentBlocks, contactBlocks, featuresBlocks } from './blocks/contentBlocks';
import { ecommerceBlocks } from './blocks/ecommerceBlocks';
import { heroBlocks } from './blocks/heroBlocks';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

// Helper type for block categories that use ReactNode for icon
type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

export const blockCategories: Record<string, BlockWithReactNodeIcon[]> = {
  layout: layoutBlocks,
  content: contentBlocks,
  contact: contactBlocks,
  features: featuresBlocks,
  ecommerce: ecommerceBlocks,
  hero: heroBlocks,
  testimonial: contentBlocks.filter(b => b.type.startsWith('testimonial')),
};
