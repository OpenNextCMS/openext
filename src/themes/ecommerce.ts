import type { SystemThemeDef } from './index';

/** Ecommerce — energetic, conversion-focused with warm CTAs and roomy cards. */
const ecommerce: SystemThemeDef = {
  slug: 'ecommerce',
  name: 'Ecommerce',
  description: 'Energetic and conversion-focused — warm CTAs, roomy cards and clear pricing.',
  isSystemTheme: true,
  previewImage: '/themes/ecommerce.png',
  theme: {
    colors: {
      primary: '#ea580c',
      secondary: '#0891b2',
      accent: '#facc15',
      background: '#ffffff',
      surface: '#fafaf9',
      text: '#1c1917',
      muted: '#78716c',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
    },
    typography: {
      displayFont: 'Poppins, Inter, system-ui, sans-serif',
      headingFont: 'Poppins, Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.6',
    },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
    radius: { sm: '6px', md: '12px', lg: '20px', xl: '28px', '2xl': '36px' },
    shadows: {
      sm: '0 1px 3px rgba(0,0,0,0.08)',
      md: '0 4px 8px rgba(0,0,0,0.1)',
      lg: '0 12px 24px rgba(0,0,0,0.12)',
      xl: '0 24px 48px rgba(0,0,0,0.16)',
    },
    layout: { containerWidth: '1280px', sectionSpacing: '72px' },
  },
  componentVariants: {
    navbar: 'default',
    hero: 'main',
    features: 'boxed',
    cta: 'default',
    pricing: 'default',
    testimonials: 'main',
    footer: 'default',
  },
};

export default ecommerce;
