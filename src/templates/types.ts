/**
 * Shared types and option metadata for the first-time Website Setup Wizard.
 *
 * Everything the wizard offers as a choice (website types, headers, footers,
 * themes, business categories) is enumerated here so both the UI and the
 * server-side generation pipeline import from a single source of truth.
 *
 * NOTE: No new CMS block types are introduced anywhere in this feature — the
 * generated site is composed entirely of existing blocks (see
 * src/components/editor/renderblock.tsx). These unions are wizard-only.
 */

export type WebsiteType =
  | 'agency'
  | 'saas'
  | 'ecommerce'
  | 'portfolio'
  | 'personal-brand'
  | 'corporate'
  | 'restaurant'
  | 'real-estate'
  | 'healthcare'
  | 'education';

export type HeaderId =
  | 'classic'
  | 'centered'
  | 'modern-saas'
  | 'mega-menu'
  | 'sidebar';

export type FooterId = 'simple' | 'corporate' | 'newsletter' | 'ecommerce';

/** The 8 design styles the wizard presents (Step 5). */
export type WizardThemeId =
  | 'modern'
  | 'corporate'
  | 'minimal'
  | 'luxury'
  | 'dark'
  | 'creative'
  | 'startup'
  | 'ecommerce';

/**
 * Wizard theme label -> persisted system-theme slug. `luxury` and `dark` are
 * newly-authored system themes (src/themes/{luxury,dark}.ts); the rest reuse
 * existing system themes.
 */
export const WIZARD_THEME_TO_SLUG: Record<WizardThemeId, string> = {
  modern: 'startup',
  corporate: 'corporate',
  minimal: 'portfolio',
  luxury: 'luxury',
  dark: 'dark',
  creative: 'agency',
  startup: 'startup',
  ecommerce: 'ecommerce',
};

/** Business categories offered in Step 1 (searchable dropdown). */
export const BUSINESS_CATEGORIES = [
  'Marketing Agency',
  'Software Company',
  'AI Startup',
  'Restaurant',
  'Coffee Shop',
  'Dental Clinic',
  'Real Estate Agency',
  'Construction Company',
  'Law Firm',
  'Consulting Firm',
  'Fitness Studio',
  'Ecommerce Store',
  'Fashion Brand',
  'Personal Portfolio',
  'Photographer',
  'Designer',
  'Developer',
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

/** The wizard payload collected across all steps. */
export interface WizardData {
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  location: string;
  websiteType: WebsiteType | '';
  headerTemplate: HeaderId | '';
  footerTemplate: FooterId | '';
  theme: WizardThemeId | '';
}

export const EMPTY_WIZARD_DATA: WizardData = {
  businessName: '',
  businessCategory: '',
  businessDescription: '',
  location: '',
  websiteType: '',
  headerTemplate: '',
  footerTemplate: '',
  theme: '',
};

/* ------------------------------------------------------------------ *
 * Option metadata (label + description + preview) for the wizard UI.  *
 * ------------------------------------------------------------------ */

export interface WebsiteTypeOption {
  id: WebsiteType;
  label: string;
  description: string;
  /** Remote preview image (Unsplash) shown on the selection card. */
  preview: string;
}

export const WEBSITE_TYPE_OPTIONS: WebsiteTypeOption[] = [
  { id: 'agency', label: 'Agency', description: 'Service studios, marketing and creative teams.', preview: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=640&q=70&auto=format&fit=crop' },
  { id: 'saas', label: 'SaaS', description: 'Software products, apps and platforms.', preview: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=640&q=70&auto=format&fit=crop' },
  { id: 'ecommerce', label: 'Ecommerce', description: 'Online stores and product catalogs.', preview: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=640&q=70&auto=format&fit=crop' },
  { id: 'portfolio', label: 'Portfolio', description: 'Showcase work, projects and case studies.', preview: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=640&q=70&auto=format&fit=crop' },
  { id: 'personal-brand', label: 'Personal Brand', description: 'Creators, coaches and public profiles.', preview: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&q=70&auto=format&fit=crop' },
  { id: 'corporate', label: 'Corporate', description: 'Established companies and enterprises.', preview: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=640&q=70&auto=format&fit=crop' },
  { id: 'restaurant', label: 'Restaurant', description: 'Eateries, cafes and food businesses.', preview: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&q=70&auto=format&fit=crop' },
  { id: 'real-estate', label: 'Real Estate', description: 'Agencies, listings and property firms.', preview: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=640&q=70&auto=format&fit=crop' },
  { id: 'healthcare', label: 'Healthcare', description: 'Clinics, practices and wellness brands.', preview: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=640&q=70&auto=format&fit=crop' },
  { id: 'education', label: 'Education', description: 'Schools, courses and learning platforms.', preview: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=640&q=70&auto=format&fit=crop' },
];

export interface HeaderOption {
  id: HeaderId;
  label: string;
  description: string;
}

export const HEADER_OPTIONS: HeaderOption[] = [
  { id: 'classic', label: 'Classic Navigation', description: 'Logo left, horizontal links right.' },
  { id: 'centered', label: 'Centered Navigation', description: 'Centered logo with stacked links.' },
  { id: 'modern-saas', label: 'Modern SaaS', description: 'Links plus a prominent call-to-action.' },
  { id: 'mega-menu', label: 'Mega Menu', description: 'Dropdown groups for larger sites.' },
  { id: 'sidebar', label: 'Sidebar Navigation', description: 'Vertical side navigation layout.' },
];

export interface FooterOption {
  id: FooterId;
  label: string;
  description: string;
}

export const FOOTER_OPTIONS: FooterOption[] = [
  { id: 'simple', label: 'Simple Footer', description: 'Brand line and essential links.' },
  { id: 'corporate', label: 'Corporate Footer', description: 'Multi-column link groups, shows your address.' },
  { id: 'newsletter', label: 'Newsletter Footer', description: 'Email signup with links.' },
  { id: 'ecommerce', label: 'Ecommerce Footer', description: 'Shop, support and policy columns.' },
];

export interface ThemeOption {
  id: WizardThemeId;
  label: string;
  /** Representative swatch derived from the underlying system theme. */
  colors: { primary: string; secondary: string; background: string; text: string };
  fontFamily: string;
  radius: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'modern', label: 'Modern', colors: { primary: '#2563eb', secondary: '#7c3aed', background: '#ffffff', text: '#0f172a' }, fontFamily: 'Inter, sans-serif', radius: '8px' },
  { id: 'corporate', label: 'Corporate', colors: { primary: '#1e3a5f', secondary: '#475569', background: '#ffffff', text: '#0f172a' }, fontFamily: 'Inter, sans-serif', radius: '4px' },
  { id: 'minimal', label: 'Minimal', colors: { primary: '#111827', secondary: '#6b7280', background: '#ffffff', text: '#111827' }, fontFamily: 'Georgia, serif', radius: '16px' },
  { id: 'luxury', label: 'Luxury', colors: { primary: '#b8860b', secondary: '#1a1a1a', background: '#faf8f3', text: '#1a1a1a' }, fontFamily: 'Playfair Display, serif', radius: '2px' },
  { id: 'dark', label: 'Dark', colors: { primary: '#6366f1', secondary: '#22d3ee', background: '#0b0f19', text: '#e5e7eb' }, fontFamily: 'Inter, sans-serif', radius: '10px' },
  { id: 'creative', label: 'Creative', colors: { primary: '#ec4899', secondary: '#8b5cf6', background: '#0f0f17', text: '#f5f5f5' }, fontFamily: 'Poppins, sans-serif', radius: '20px' },
  { id: 'startup', label: 'Startup', colors: { primary: '#2563eb', secondary: '#06b6d4', background: '#ffffff', text: '#0f172a' }, fontFamily: 'Inter, sans-serif', radius: '8px' },
  { id: 'ecommerce', label: 'Ecommerce', colors: { primary: '#ea580c', secondary: '#16a34a', background: '#ffffff', text: '#111827' }, fontFamily: 'Inter, sans-serif', radius: '12px' },
];
