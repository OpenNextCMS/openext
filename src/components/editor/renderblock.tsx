'use client';

import type { BlockRendererProps } from '@/types/index';
import { ColumnBlock } from './blocks/ColumnBlock';
import { TextBlock } from './blocks/TextBlock';
import { StatsBlock } from './blocks/StatsBlock';
import { ProgressBarBlock } from './blocks/ProgressBarBlock';
import { CountdownBlock } from './blocks/CountdownBlock';
import { RowBlock } from './blocks/RowBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { IconBlock } from './blocks/IconBlock';
import { InputBlock } from './blocks/InputBlock';
import { ChoiceInputBlock } from './blocks/ChoiceInputBlock';
import { ReusableUiBlock } from './blocks/ReusableUiBlock';
import { ImageBlock } from './blocks/ImageBlock';
import { CardBlock } from './blocks/CardBlock';
import { ShapeDividerBlock } from './blocks/ShapeDividerBlock';
import { NavbarBlock } from './blocks/NavbarBlock';
import { GenericUiBlock } from './blocks/GenericUiBlock';
import { pluginRegistry } from '@/lib/pluginRegistry';
import { ContactUI } from '@/components/ui/ContactUI';
import { ContactSimple } from '@/components/ui/ContactSimple';
import { StatisticsMain } from '@/components/ui/StatisticsMain';
import { StatisticsSideImage } from '@/components/ui/StatisticsSideImage';
import { StatisticsBoxed } from '@/components/ui/StatisticsBoxed';
import { TestimonialMain } from '@/components/ui/TestimonialMain';
import { TestimonialSingle } from '@/components/ui/TestimonialSingle';
import { TestimonialSingleLarge } from '@/components/ui/TestimonialSingleLarge';
import { HeroMain } from '@/components/ui/HeroMain';

import { HeroCentered } from '@/components/ui/HeroCentered';
import { ContentFeatures } from '@/components/ui/ContentFeatures';
import { ContentGallery } from '@/components/ui/ContentGallery';
import { ContentIcons } from '@/components/ui/ContentIcons';
import { ContentCategories } from '@/components/ui/ContentCategories';
import { ContentDetail } from '@/components/ui/ContentDetail';
import { ContentSplit } from '@/components/ui/ContentSplit';
import { ContentTrio } from '@/components/ui/ContentTrio';
import { FeatureTrio } from '@/components/ui/FeatureTrio';
import { FeatureVertical } from '@/components/ui/FeatureVertical';
import { FeatureSideImage } from '@/components/ui/FeatureSideImage';
import { FeatureHorizontal } from '@/components/ui/FeatureHorizontal';
import { FeatureBoxed } from '@/components/ui/FeatureBoxed';
import { FeatureZigzag } from '@/components/ui/FeatureZigzag';
import { FeatureChecklist } from '@/components/ui/FeatureChecklist';
import { FeatureList } from '@/components/ui/FeatureList';
import { EcommerceGrid } from '@/components/ui/EcommerceGrid';
import { EcommerceDetail } from '@/components/ui/EcommerceDetail';
import { EcommerceInfo } from '@/components/ui/EcommerceInfo';

const blockComponents: Record<string, React.ComponentType<BlockRendererProps>> = {
  column: ColumnBlock,
  row: RowBlock,
  button: ButtonBlock,
  icon: IconBlock,
  input: InputBlock,
  image: ImageBlock,
  card: CardBlock,
  'shape-divider': ShapeDividerBlock,
  'nav-bar': NavbarBlock,
  text: TextBlock,
  stats: StatsBlock,
  progress: ProgressBarBlock,
  countdown: CountdownBlock,
};

const genericUiBlocks: Record<string, { component: React.ComponentType<BlockRendererProps>; label: string }> = {
  contact: { component: ContactUI, label: 'Contact UI' },
  'contact-simple': { component: ContactSimple, label: 'Contact Simple' },
  'statistics-main': { component: StatisticsMain, label: 'Statistics Main' },
  'statistics-side-image': { component: StatisticsSideImage, label: 'Statistics Side Image' },
  'statistics-boxed': { component: StatisticsBoxed, label: 'Statistics Boxed' },
  'testimonial-main': { component: TestimonialMain, label: 'Testimonial Main' },
  'testimonial-single': { component: TestimonialSingle, label: 'Testimonial Single' },
  'testimonial-single-large': { component: TestimonialSingleLarge, label: 'Testimonial Large' },
  'hero-main': { component: HeroMain, label: 'Hero Main' },
  'hero-centered': { component: HeroCentered, label: 'Hero Centered' },
  'content-features': { component: ContentFeatures, label: 'Content Features' },
  'content-gallery': { component: ContentGallery, label: 'Content Gallery' },
  'content-icons': { component: ContentIcons, label: 'Content Icons' },
  'content-categories': { component: ContentCategories, label: 'Content Categories' },
  'content-detail': { component: ContentDetail, label: 'Content Detail' },
  'content-split': { component: ContentSplit, label: 'Content Split' },
  'content-trio': { component: ContentTrio, label: 'Content Trio' },
  'feature-trio': { component: FeatureTrio, label: 'Feature Trio' },
  'feature-vertical': { component: FeatureVertical, label: 'Feature Vertical' },
  'feature-side-image': { component: FeatureSideImage, label: 'Feature Side Image' },
  'feature-horizontal': { component: FeatureHorizontal, label: 'Feature Horizontal' },
  'feature-boxed': { component: FeatureBoxed, label: 'Feature Boxed' },
  'feature-zigzag': { component: FeatureZigzag, label: 'Feature Zigzag' },
  'feature-checklist': { component: FeatureChecklist, label: 'Feature Checklist' },
  'feature-list': { component: FeatureList, label: 'Feature List' },
  'ecommerce-grid': { component: EcommerceGrid, label: 'Product Grid' },
  'ecommerce-detail': { component: EcommerceDetail, label: 'Ecommerce Detail' },
  'ecommerce-info': { component: EcommerceInfo, label: 'Ecommerce Info' },
};

const reusableUiTypes = ['radio', 'checkbox', 'avatar', 'separator', 'skeleton', 'switch', 'textarea', 'table', 'tabs'];

const RenderBlock = ({ block, isEditing = true }: BlockRendererProps) => {
  // 1. Check if it's a plugin-provided block
  const pluginExtension = pluginRegistry.getExtension(block.type);
  if (pluginExtension) {
    const PluginComponent = pluginExtension.component;
    return <PluginComponent block={block} isEditing={isEditing} />;
  }

  // 2. Check for choice inputs
  if (block.type === 'radio' || block.type === 'checkbox') {
    return <ChoiceInputBlock block={block} isEditing={isEditing} />;
  }

  // 3. Check for reusable UI blocks
  if (reusableUiTypes.includes(block.type)) {
    return <ReusableUiBlock block={block} isEditing={isEditing} />;
  }

  // 4. Check for generic UI blocks (wrapped with GenericUiBlock)
  const genericConfig = genericUiBlocks[block.type];
  if (genericConfig) {
    return (
      <GenericUiBlock
        block={block}
        isEditing={isEditing}
        Component={genericConfig.component}
        label={genericConfig.label}
      />
    );
  }

  // 5. Use component map for standard blocks
  const Component = blockComponents[block.type];
  if (Component) {
    return <Component block={block} isEditing={isEditing} />;
  }

  return null; // Unknown block type
};

export default RenderBlock;
