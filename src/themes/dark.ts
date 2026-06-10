import type { SystemThemeDef } from './index';

/** Dark — deep slate canvas with vivid indigo/cyan accents for night-mode sites. */
const dark: SystemThemeDef = {
  slug: 'dark',
  name: 'Dark',
  description: 'Sleek dark canvas with vivid indigo and cyan accents — modern and high-contrast.',
  isSystemTheme: true,
  previewImage: '/themes/dark.png',
  theme: {
    colors: {
      primary: '#6366f1',
      secondary: '#22d3ee',
      accent: '#a855f7',
      background: '#0b0f19',
      surface: '#151b2b',
      text: '#e5e7eb',
      muted: '#94a3b8',
      success: '#34d399',
      warning: '#fbbf24',
      danger: '#f87171',
    },
    typography: {
      displayFont: '"Space Grotesk", Inter, system-ui, sans-serif',
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.65',
    },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '26px', xl: '44px' },
    radius: { sm: '6px', md: '10px', lg: '16px', xl: '24px', '2xl': '32px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.4)',
      md: '0 4px 12px rgba(0,0,0,0.5)',
      lg: '0 12px 28px rgba(0,0,0,0.55)',
      xl: '0 28px 60px rgba(0,0,0,0.6)',
    },
    layout: { containerWidth: '1200px', sectionSpacing: '88px' },
  },
  componentVariants: {
    navbar: 'default',
    hero: 'centered',
    features: 'trio',
    cta: 'default',
    pricing: 'default',
    testimonials: 'main',
    footer: 'default',
  },
  meta: {
    appearance: 'dark',
  },
};

export default dark;
