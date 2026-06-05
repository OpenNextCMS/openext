import type { SystemThemeDef } from './index';

/** Portfolio — minimal, editorial, generous whitespace and large radii. */
const portfolio: SystemThemeDef = {
  slug: 'portfolio',
  name: 'Portfolio',
  description: 'Minimal and editorial — generous whitespace, large radii and a calm palette.',
  isSystemTheme: true,
  previewImage: '/themes/portfolio.png',
  theme: {
    colors: {
      primary: '#111827',
      secondary: '#6b7280',
      accent: '#10b981',
      background: '#fdfdfc',
      surface: '#f5f5f4',
      text: '#1c1917',
      muted: '#a8a29e',
      success: '#059669',
      warning: '#ca8a04',
      danger: '#dc2626',
    },
    typography: {
      headingFont: '"Playfair Display", Georgia, serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      baseFontSize: '17px',
      lineHeight: '1.8',
    },
    spacing: { xs: '6px', sm: '12px', md: '20px', lg: '32px', xl: '56px' },
    radius: { sm: '8px', md: '16px', lg: '24px', xl: '36px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.04)',
      md: '0 4px 10px rgba(0,0,0,0.06)',
      lg: '0 12px 28px rgba(0,0,0,0.08)',
    },
    layout: { containerWidth: '1080px', sectionSpacing: '112px' },
  },
  componentVariants: {
    navbar: 'centered',
    hero: 'centered',
    features: 'vertical',
    cta: 'default',
    pricing: 'default',
    testimonials: 'single',
    footer: 'default',
  },
};

export default portfolio;
