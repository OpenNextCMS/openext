import type { SystemThemeDef } from './index';

/** Agency — bold, high-contrast, dark surface with vivid accents. */
const agency: SystemThemeDef = {
  slug: 'agency',
  name: 'Agency',
  description: 'Bold and high-contrast with a dark surface and vivid accents — great for studios.',
  isSystemTheme: true,
  previewImage: '/themes/agency.png',
  theme: {
    colors: {
      primary: '#f43f5e',
      secondary: '#8b5cf6',
      accent: '#fbbf24',
      background: '#0b0b0f',
      surface: '#16161d',
      text: '#f8fafc',
      muted: '#94a3b8',
      success: '#22c55e',
      warning: '#f59e0b',
      danger: '#ef4444',
    },
    typography: {
      headingFont: '"Space Grotesk", Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.7',
    },
    spacing: { xs: '4px', sm: '10px', md: '18px', lg: '28px', xl: '48px' },
    radius: { sm: '2px', md: '6px', lg: '12px', xl: '20px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.4)',
      md: '0 6px 12px -2px rgba(0,0,0,0.5)',
      lg: '0 16px 30px -6px rgba(0,0,0,0.6)',
    },
    layout: { containerWidth: '1280px', sectionSpacing: '96px' },
  },
  componentVariants: {
    navbar: 'split',
    hero: 'centered',
    features: 'zigzag',
    cta: 'default',
    pricing: 'default',
    testimonials: 'single-large',
    footer: 'default',
  },
};

export default agency;
