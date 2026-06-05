import type { SystemThemeDef } from './index';

/** Startup — clean, modern, blue-forward. The default system theme. */
const startup: SystemThemeDef = {
  slug: 'startup',
  name: 'Startup',
  description: 'Clean, modern and blue-forward — a friendly default for product and SaaS sites.',
  isSystemTheme: true,
  previewImage: '/themes/startup.png',
  theme: {
    colors: {
      primary: '#2563eb',
      secondary: '#7c3aed',
      accent: '#06b6d4',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      success: '#16a34a',
      warning: '#d97706',
      danger: '#dc2626',
    },
    typography: {
      headingFont: 'Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.6',
    },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
    radius: { sm: '4px', md: '8px', lg: '16px', xl: '24px' },
    shadows: {
      sm: '0 1px 2px rgba(0,0,0,0.05)',
      md: '0 4px 6px -1px rgba(0,0,0,0.1)',
      lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
    },
    layout: { containerWidth: '1200px', sectionSpacing: '80px' },
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
};

export default startup;
