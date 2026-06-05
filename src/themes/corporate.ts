import type { SystemThemeDef } from './index';

/** Corporate — restrained, trustworthy navy/slate with tight radii. */
const corporate: SystemThemeDef = {
  slug: 'corporate',
  name: 'Corporate',
  description: 'Restrained and trustworthy — navy and slate tones with tight, professional radii.',
  isSystemTheme: true,
  previewImage: '/themes/corporate.png',
  theme: {
    colors: {
      primary: '#1e3a8a',
      secondary: '#0f766e',
      accent: '#b45309',
      background: '#ffffff',
      surface: '#f1f5f9',
      text: '#1e293b',
      muted: '#64748b',
      success: '#15803d',
      warning: '#b45309',
      danger: '#b91c1c',
    },
    typography: {
      headingFont: 'Georgia, "Times New Roman", serif',
      bodyFont: 'Arial, Helvetica, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.5',
    },
    spacing: { xs: '4px', sm: '8px', md: '14px', lg: '22px', xl: '36px' },
    radius: { sm: '2px', md: '4px', lg: '8px', xl: '12px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.06)',
      md: '0 2px 4px rgba(0,0,0,0.08)',
      lg: '0 6px 12px rgba(0,0,0,0.1)',
    },
    layout: { containerWidth: '1140px', sectionSpacing: '72px' },
  },
  componentVariants: {
    navbar: 'default',
    hero: 'main',
    features: 'horizontal',
    cta: 'default',
    pricing: 'default',
    testimonials: 'main',
    footer: 'default',
  },
};

export default corporate;
