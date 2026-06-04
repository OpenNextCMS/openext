import type { BlockData } from '@/types/index';

export type SliderPreset = 'banner' | 'card' | 'product' | 'testimonial' | 'custom';
export type SliderTransition = 'slide' | 'fade' | 'scale' | 'flip';
export type SliderBreakpoint = 'desktop' | 'tablet' | 'mobile';

export interface SliderSlideContent {
  title: string;
  subtitle?: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  image: string;
  price?: string;
  discountPrice?: string;
  rating?: number;
  badge?: string;
  customerName?: string;
  company?: string;
  blocks?: BlockData[];
}

export interface SliderSlide {
  id: string;
  name: string;
  type: SliderPreset;
  content: SliderSlideContent;
}

export interface SliderContent extends Record<string, unknown> {
  type: 'slider';
  preset: SliderPreset;
  autoplay: boolean;
  interval: number;
  speed: number;
  transition: SliderTransition;
  pauseOnHover: boolean;
  navigation: {
    arrows: boolean;
    dots: boolean;
    swipe: boolean;
    infinite: boolean;
  };
  layout: {
    width: string;
    height: string;
    maxWidth: string;
    padding: string;
    margin: string;
    alignment: 'left' | 'center' | 'right';
  };
  responsive: Record<
    SliderBreakpoint,
    {
      slidesPerView: number;
      gap: number;
      height: number;
      typographyScale: number;
    }
  >;
  styling: {
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    cardBackground: string;
    borderRadius: number;
    shadow: boolean;
    overlay: boolean;
    overlayColor: string;
    overlayOpacity: number;
    cardWidth: number;
    cardGap: number;
    hoverEffect: 'none' | 'lift' | 'zoom';
  };
  dataBinding: {
    enabled: boolean;
    collection: string;
  };
  slides: SliderSlide[];
}

const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const slideImages = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
];

export const createSliderSlide = (
  preset: SliderPreset,
  index: number,
  overrides: Partial<SliderSlide> = {}
): SliderSlide => {
  const base: SliderSlide = {
    id: id('slide'),
    name: `${preset.charAt(0).toUpperCase()}${preset.slice(1)} ${index}`,
    type: preset,
    content: {
      title: 'Summer Sale',
      subtitle: 'Featured collection',
      description: 'Create banners, cards, products, testimonials, and custom content sliders.',
      buttonText: 'Shop Now',
      buttonUrl: '#',
      image: slideImages[(index - 1) % slideImages.length],
      price: '$129',
      discountPrice: '$89',
      rating: 5,
      badge: index === 1 ? 'New' : 'Sale',
      customerName: 'Avery Stone',
      company: 'Northwind Studio',
      blocks: [],
    },
  };

  if (preset === 'card') {
    base.name = `Card ${index}`;
    base.content.title = index === 1 ? 'Editorial Card' : `Content Card ${index}`;
    base.content.description = 'Use image, title, body copy, and a call to action in each card.';
    base.content.buttonText = 'Read More';
  }

  if (preset === 'product') {
    base.name = `Product ${index}`;
    base.content.title = index === 1 ? 'Performance Jacket' : `Product ${index}`;
    base.content.description = 'Lightweight, durable, and ready for daily use.';
    base.content.buttonText = 'Add to Cart';
  }

  if (preset === 'testimonial') {
    base.name = `Testimonial ${index}`;
    base.content.title = 'Fast, flexible, and easy to update.';
    base.content.description = 'The visual editor lets our team keep pages fresh without waiting on code changes.';
    base.content.buttonText = '';
  }

  if (preset === 'custom') {
    base.name = `Custom Slide ${index}`;
    base.content.title = 'Custom Content';
    base.content.description = 'Drop content blocks into this slide or edit the starter fields.';
    base.content.buttonText = 'Explore';
  }

  return {
    ...base,
    ...overrides,
    content: {
      ...base.content,
      ...(overrides.content || {}),
    },
  };
};

export const createDefaultSliderContent = (): SliderContent => ({
  type: 'slider',
  preset: 'banner',
  autoplay: true,
  interval: 3000,
  speed: 500,
  transition: 'slide',
  pauseOnHover: true,
  navigation: {
    arrows: true,
    dots: true,
    swipe: true,
    infinite: true,
  },
  layout: {
    width: '100%',
    height: '420px',
    maxWidth: '100%',
    padding: '0px',
    margin: '0 auto',
    alignment: 'center',
  },
  responsive: {
    desktop: { slidesPerView: 1, gap: 24, height: 420, typographyScale: 1 },
    tablet: { slidesPerView: 1, gap: 18, height: 360, typographyScale: 0.92 },
    mobile: { slidesPerView: 1, gap: 12, height: 320, typographyScale: 0.82 },
  },
  styling: {
    accentColor: '#2563eb',
    backgroundColor: '#f8fafc',
    textColor: '#111827',
    cardBackground: '#ffffff',
    borderRadius: 8,
    shadow: true,
    overlay: true,
    overlayColor: '#111827',
    overlayOpacity: 42,
    cardWidth: 320,
    cardGap: 24,
    hoverEffect: 'lift',
  },
  dataBinding: {
    enabled: false,
    collection: 'products',
  },
  slides: [
    createSliderSlide('banner', 1, {
      name: 'Hero Banner',
      content: {
        title: 'Summer Sale',
        subtitle: 'Limited time offer',
        description: 'Up to 50% off selected products.',
        buttonText: 'Shop Now',
        buttonUrl: '#',
        image: slideImages[0],
      },
    }),
    createSliderSlide('card', 2, {
      name: 'Feature Card',
      content: {
        title: 'Built for visual editing',
        description: 'Cards support images, text, spacing, radius, hover effects, and CTAs.',
        buttonText: 'Learn More',
        buttonUrl: '#',
        image: slideImages[1],
      },
    }),
    createSliderSlide('product', 3, {
      name: 'Product Card',
      content: {
        title: 'Premium Hoodie',
        description: 'Soft fleece hoodie with a clean everyday fit.',
        buttonText: 'Add to Cart',
        buttonUrl: '#',
        image: slideImages[2],
        price: '$79',
        discountPrice: '$59',
        rating: 4.8,
        badge: 'Sale',
      },
    }),
  ],
});

const asNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeSlide = (
  raw: Partial<SliderSlide> & {
    title?: string;
    desc?: string;
    image?: string;
    buttonText?: string;
  },
  fallbackPreset: SliderPreset,
  index: number
): SliderSlide => {
  const fallback = createSliderSlide((raw.type as SliderPreset) || fallbackPreset, index + 1);
  const rawContent = (raw.content || {}) as Partial<SliderSlideContent>;

  return {
    ...fallback,
    id: typeof raw.id === 'string' ? raw.id : fallback.id,
    name: typeof raw.name === 'string' ? raw.name : fallback.name,
    type: (raw.type as SliderPreset) || fallbackPreset,
    content: {
      ...fallback.content,
      ...rawContent,
      title: rawContent.title || raw.title || fallback.content.title,
      description: rawContent.description || raw.desc || fallback.content.description,
      image: rawContent.image || raw.image || fallback.content.image,
      buttonText: rawContent.buttonText || raw.buttonText || fallback.content.buttonText,
      blocks: Array.isArray(rawContent.blocks) ? rawContent.blocks : [],
    },
  };
};

export const normalizeSliderContent = (input?: unknown): SliderContent => {
  const defaults = createDefaultSliderContent();
  const raw = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  const preset = (raw.preset as SliderPreset) || defaults.preset;
  const legacySlidesToShow = asNumber(raw.slidesToShow, defaults.responsive.desktop.slidesPerView);

  const slides = Array.isArray(raw.slides)
    ? raw.slides.map((slide, index) =>
        normalizeSlide(slide as Partial<SliderSlide>, preset, index)
      )
    : defaults.slides;

  return {
    ...defaults,
    ...raw,
    type: 'slider',
    preset,
    autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : defaults.autoplay,
    interval: asNumber(raw.interval, defaults.interval),
    speed: asNumber(raw.speed, defaults.speed),
    transition: (raw.transition as SliderTransition) || defaults.transition,
    pauseOnHover:
      typeof raw.pauseOnHover === 'boolean' ? raw.pauseOnHover : defaults.pauseOnHover,
    navigation: {
      ...defaults.navigation,
      ...(typeof raw.navigation === 'object' && raw.navigation ? raw.navigation : {}),
      arrows:
        typeof raw.showArrows === 'boolean'
          ? raw.showArrows
          : ((raw.navigation as SliderContent['navigation'])?.arrows ?? defaults.navigation.arrows),
      dots:
        typeof raw.showDots === 'boolean'
          ? raw.showDots
          : ((raw.navigation as SliderContent['navigation'])?.dots ?? defaults.navigation.dots),
    },
    layout: {
      ...defaults.layout,
      ...(typeof raw.layout === 'object' && raw.layout ? raw.layout : {}),
    },
    responsive: {
      desktop: {
        ...defaults.responsive.desktop,
        ...(typeof raw.responsive === 'object' && raw.responsive
          ? (raw.responsive as SliderContent['responsive']).desktop
          : {}),
        slidesPerView: legacySlidesToShow,
      },
      tablet: {
        ...defaults.responsive.tablet,
        ...(typeof raw.responsive === 'object' && raw.responsive
          ? (raw.responsive as SliderContent['responsive']).tablet
          : {}),
      },
      mobile: {
        ...defaults.responsive.mobile,
        ...(typeof raw.responsive === 'object' && raw.responsive
          ? (raw.responsive as SliderContent['responsive']).mobile
          : {}),
      },
    },
    styling: {
      ...defaults.styling,
      ...(typeof raw.styling === 'object' && raw.styling ? raw.styling : {}),
      accentColor: (raw.accentColor as string) || defaults.styling.accentColor,
    },
    dataBinding: {
      ...defaults.dataBinding,
      ...(typeof raw.dataBinding === 'object' && raw.dataBinding ? raw.dataBinding : {}),
    },
    slides,
  };
};

export const sliderDefaultContentString = JSON.stringify(createDefaultSliderContent());
