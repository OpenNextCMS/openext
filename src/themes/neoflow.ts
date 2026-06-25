import type { SystemThemeDef } from './index';

/**
 * NeoFlow — an AI-native, next-generation design system.
 *
 * Premium, minimal and futuristic (Linear / Stripe / Vercel / Arc / Framer).
 * The live engine applies the `theme` tokens as CSS variables (see
 * `src/lib/theme/cssVars.site.ts`) and resolves `componentVariants` through the
 * variant registry. Everything the current engine does not consume directly —
 * the dark palette, the Space Grotesk display font, the full type scale, the
 * animation presets, the layout patterns and the AI generation hints — is kept
 * in `meta` (persisted to `Theme.meta`, a Mixed/forward-compat field) so it is
 * available to the AI page generator and future engine features without a
 * schema change.
 *
 * NOTE: `componentVariants` below only uses ids that exist in the registry
 * (`src/lib/theme/component-registry.ts`). Aspirational layouts the registry
 * does not yet have (split hero, bento features, gradient button, …) live under
 * `meta.aiHints` / `meta.layoutPatterns` as hints, not as live selections.
 */
const neoflow: SystemThemeDef = {
  slug: 'neoflow',
  name: 'NeoFlow',
  description:
    'AI-native and futuristic — premium, minimal and fast. Indigo/violet accents, generous whitespace and soft elevation.',
  isSystemTheme: true,
  previewImage: '/themes/neoflow.png',

  // ── Live tokens (light) → emitted as CSS variables ───────────────────────
  theme: {
    colors: {
      primary: '#4F46E5',
      secondary: '#7C3AED',
      accent: '#06B6D4',
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text: '#0F172A',
      muted: '#64748B',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#EF4444',
    },
    typography: {
      // Space Grotesk powers the big display/hero text (var --font-display);
      // Inter Tight is the heading face; Inter is the body.
      displayFont: '"Space Grotesk", "Inter Tight", Inter, system-ui, sans-serif',
      headingFont: '"Inter Tight", Inter, system-ui, sans-serif',
      bodyFont: 'Inter, system-ui, sans-serif',
      baseFontSize: '16px',
      lineHeight: '1.6',
    },
    // Modern 8px scale, generous.
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
    // Soft, premium corners.
    radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '32px' },
    // Subtle premium elevation (no harsh shadows).
    shadows: {
      sm: '0 1px 2px rgba(15,23,42,0.06)',
      md: '0 4px 12px -2px rgba(15,23,42,0.08)',
      lg: '0 12px 32px -8px rgba(15,23,42,0.12)',
      xl: '0 24px 56px -12px rgba(15,23,42,0.18)',
    },
    layout: { containerWidth: '1200px', sectionSpacing: '112px' },
  },

  // ── Live section variants (must be real registry ids) ────────────────────
  componentVariants: {
    navbar: 'default',
    hero: 'split',
    features: 'bento',
    cta: 'default',
    pricing: 'default',
    testimonials: 'main',
    footer: 'default',
  },

  // ── Forward-compat data (persisted to Theme.meta; JSON-safe) ─────────────
  meta: {
    designLanguage: 'AI-native · premium · minimal · futuristic (Linear / Stripe / Vercel / Arc / Framer)',

    // AI page-generation hints (read by the generator to bias layouts).
    aiHints: {
      preferredHero: 'split',
      preferredFeatureLayout: 'bento',
      preferredButton: 'gradient',
      preferredCards: 'elevated',
      spacingStyle: 'generous',
      animationStyle: 'subtle',
      visualDensity: 'comfortable',
    },

    fonts: {
      display: '"Space Grotesk", Inter, system-ui, sans-serif',
      heading: '"Inter Tight", Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
      // Google Fonts to load if the host wants the full trio.
      googleFonts: ['Space+Grotesk:wght@500;600;700', 'Inter+Tight:wght@500;600;700', 'Inter:wght@400;500;600'],
    },

    // Full SaaS type scale (rem-based) — beyond the engine's 4 typography keys.
    typographyScale: {
      'display-xl': { size: '4.5rem', lineHeight: '1.05', weight: 700, letterSpacing: '-0.03em', font: 'display' },
      'display-lg': { size: '3.75rem', lineHeight: '1.05', weight: 700, letterSpacing: '-0.03em', font: 'display' },
      'display-md': { size: '3rem', lineHeight: '1.1', weight: 700, letterSpacing: '-0.02em', font: 'display' },
      h1: { size: '2.25rem', lineHeight: '1.15', weight: 600, letterSpacing: '-0.02em', font: 'heading' },
      h2: { size: '1.875rem', lineHeight: '1.2', weight: 600, letterSpacing: '-0.01em', font: 'heading' },
      h3: { size: '1.5rem', lineHeight: '1.25', weight: 600, font: 'heading' },
      h4: { size: '1.25rem', lineHeight: '1.3', weight: 600, font: 'heading' },
      h5: { size: '1.125rem', lineHeight: '1.4', weight: 600, font: 'heading' },
      'body-lg': { size: '1.125rem', lineHeight: '1.7', weight: 400, font: 'body' },
      'body-md': { size: '1rem', lineHeight: '1.6', weight: 400, font: 'body' },
      'body-sm': { size: '0.875rem', lineHeight: '1.5', weight: 400, font: 'body' },
      caption: { size: '0.75rem', lineHeight: '1.4', weight: 500, letterSpacing: '0.02em', font: 'body' },
    },

    // Full 8px spacing scale (engine uses xs–xl; 2xl–5xl kept here).
    spacingScale: {
      xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px',
      '2xl': '64px', '3xl': '96px', '4xl': '128px', '5xl': '192px',
    },

    radiusScale: { sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '32px' },

    shadowScale: {
      sm: '0 1px 2px rgba(15,23,42,0.06)',
      md: '0 4px 12px -2px rgba(15,23,42,0.08)',
      lg: '0 12px 32px -8px rgba(15,23,42,0.12)',
      xl: '0 24px 56px -12px rgba(15,23,42,0.18)',
    },

    // Dark palette (the engine is single-palette; this enables a dark variant
    // or a future light/dark toggle without a second theme record).
    dark: {
      colors: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#22D3EE',
        background: '#0F172A',
        surface: '#1E293B',
        card: '#111827',
        text: '#F8FAFC',
        muted: '#CBD5E1',
        border: '#334155',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
    },
    light: { border: '#E2E8F0', card: '#FFFFFF' },

    breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },

    // Framer-Motion-compatible presets (JSON-safe: no Infinity — `loop: true`).
    animations: {
      fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, ease: 'easeOut' } },
      slideUp: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      slideDown: { initial: { opacity: 0, y: -16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
      scaleIn: { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.3, ease: 'easeOut' } },
      staggerChildren: { animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } },
      float: { animate: { y: [0, -8, 0] }, transition: { duration: 6, ease: 'easeInOut', loop: true } },
      pulseSoft: { animate: { opacity: [0.6, 1, 0.6] }, transition: { duration: 2.4, ease: 'easeInOut', loop: true } },
    },

    // Layout pattern catalog the AI generator can pick from (names are hints;
    // live rendering still resolves through the variant registry).
    layoutPatterns: {
      hero: ['centered', 'split', 'gradient', 'product', 'ai-startup'],
      features: ['grid-3', 'grid-4', 'alternating', 'bento'],
      cta: ['centered', 'split', 'floating'],
      footer: ['minimal', 'multi-column', 'enterprise'],
    },

    // Component variant vocabulary (target set; rendered subset is in
    // `componentVariants` above).
    variants: {
      button: ['primary', 'secondary', 'outline', 'ghost', 'gradient'],
      card: ['default', 'glass', 'elevated', 'bordered', 'gradient'],
      section: ['default', 'surface', 'dark', 'gradient', 'highlight'],
      hero: ['centered', 'split', 'product', 'ai-startup'],
    },

    version: '1.0.0',
  },
};

export default neoflow;
