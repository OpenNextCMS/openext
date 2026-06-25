import type { SystemThemeDef } from './index';

/** Luxury — elegant gold-on-ivory with serif display type and tight radii. */
const luxury: SystemThemeDef = {
  slug: 'luxury',
  name: 'Luxury',
  description: 'Elegant and premium — warm gold accents on ivory with refined serif typography.',
  isSystemTheme: true,
  previewImage: '/themes/luxury.png',
  theme: {
    colors: {
      primary: '#b8860b',
      secondary: '#1a1a1a',
      accent: '#c9a227',
      background: '#faf8f3',
      surface: '#f3efe6',
      text: '#1a1a1a',
      muted: '#6b6457',
      success: '#4d7c4d',
      warning: '#b8860b',
      danger: '#a13c3c',
    },
    typography: {
      displayFont: '"Playfair Display", Georgia, serif',
      headingFont: '"Playfair Display", Georgia, serif',
      bodyFont: '"EB Garamond", Georgia, serif',
      baseFontSize: '17px',
      lineHeight: '1.7',
    },
    spacing: { xs: '4px', sm: '10px', md: '18px', lg: '30px', xl: '52px' },
    radius: { sm: '1px', md: '2px', lg: '4px', xl: '8px', '2xl': '12px' },
    shadows: {
      sm: '0 1px 2px rgba(26,26,26,0.06)',
      md: '0 4px 10px rgba(26,26,26,0.08)',
      lg: '0 12px 24px rgba(26,26,26,0.10)',
      xl: '0 28px 56px rgba(26,26,26,0.14)',
    },
    layout: { containerWidth: '1180px', sectionSpacing: '96px' },
  },
  componentVariants: {
    navbar: 'default',
    hero: 'main',
    features: 'trio',
    cta: 'default',
    pricing: 'default',
    testimonials: 'main',
    footer: 'default',
  },
  meta: {
    mood: 'premium',
  },
};

export default luxury;
