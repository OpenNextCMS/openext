// src/types/index.ts
import { CSSProperties, ReactNode } from 'react';
import { Document, Types } from 'mongoose';

export interface MongoDBConfig {
  username: string;
  password: string;
  host: string;
  clusterName: string;
}

export interface UserRegistrationData {
  siteTitle: string;
  username: string;
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
}

export interface LanguageConfig {
  code: string;
  name: string;
}

export interface DatabaseConfig {
  user: string;
  pages: string;
}

export interface RouteContext {
  params: {
    id: string;
  };
}

export interface NavigationItem {
  name: string;
  href: string;
}

export interface ApiReference {
  [key: string]: ApiEndpoint[];
}
export interface OverviewData {
  title: string;
  description: string;
  objectives: string[];
}

export interface Feature {
  title: string;
  content: string;
}

export interface ProjectFlowData {
  setup: string[];
  postLogin: string[];
}

export interface TechStackItem {
  category: string;
  tech: string;
}

export interface ApiCategory {
  title: string;
  color: string;
  endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  apiNumber: number;
  color: string;
  request?: object | string;
  response?: object;
}

export interface PackageData {
  lastUpdated: string;
  dependencies: PackageInfo[];
  devDependencies: PackageInfo[];
}

export interface PackageInfo {
  name: string;
  dateAdded: string;
}

export interface InstallationData {
  title: string;
  description: string;
  requirements: string[];
  steps: InstallationStep[];
  troubleshooting: TroubleshootingItem[];
}

export interface InstallationStep {
  step: number;
  title: string;
  content: string;
}

export interface TroubleshootingItem {
  issue: string;
  solution: string;
}

export interface ApiEndpointProps {
  apiNumber: number;
  color: string;
  method: string;
  path: string;
  description: string;
  request?: string | object;
  response?: object;
}
export type ColumnChild = Block[];
export interface Block {
  id?: string;
  label?: string;
  type:
    | 'column'
    | 'text'
    | 'hero'
    | 'stats'
    | 'progress'
    | 'countdown'
    | 'button'
    | 'row'
    | 'icon'
    | 'hero-main'
    | 'hero-centered'
    | 'statistics-main'
    | 'statistics-side-image'
    | 'statistics-boxed'
    | 'testimonial-main'
    | 'testimonial-single'
    | 'testimonial-single-large'
    | 'input'
    | 'radio'
    | 'checkbox'
    | 'badge'
    | 'alert'
    | 'avatar'
    | 'separator'
    | 'skeleton'
    | 'switch'
    | 'textarea'
    | 'table'
    | 'tabs'
    | 'image'
    | 'card'
    | 'shape-divider'
    | 'slider'
    | 'nav-bar'
    | 'contact'
    | 'contact-simple'
    | 'content-features'
    | 'content-gallery'
    | 'content-icons'
    | 'content-categories'
    | 'content-detail'
    | 'content-split'
    | 'content-trio'
    | 'ecommerce-grid'
    | 'ecommerce-detail'
    | 'ecommerce-info'
    | 'ecommerce-info-alt'
    | 'feature-trio'
    | 'feature-vertical'
    | 'feature-side-image'
    | 'feature-horizontal'
    | 'feature-boxed'
    | 'feature-zigzag'
    | 'feature-checklist'
    | 'feature-list'
<<<<<<< HEAD
    | 'blog-feed'
    | 'form-block';
=======
    | 'blog-feed';
>>>>>>> khadija
  children?: ColumnChild[]; // Updated type for children
  content?: string;
  icon?: ReactNode | string;
  description?: string;
  uniqueId?: string;
  style?: CSSProperties;
  hoverStyle?: CSSProperties;
  events?: {
    onClick?: string;
    onClickValue?: string;
  };
}

export interface BlockDragData {
  id?: string;
  type?: string;
  content?: string;
  icon?: ReactNode | string;
  style?: CSSProperties | string;
  source?: string;
  blockId?: string;
  rowBlockId?: string;
  columnIndex?: number;
  // Add other properties that might be needed during drag operations
}

export interface BlockRendererProps {
  block: Block;
  isEditing?: boolean;
}

export interface Attribute {
  [key: string]: string;
}

export interface Element {
  id: string;
  type: string;
  label?: string;
  tag?: string;
  className?: string;
  text?: string;
  content?: string;
  style?: Record<string, string>;
  attributes?: Record<string, string>;
  events?: Record<string, string>;
  children?: Element[];
}

export interface Component {
  name: string; // This will store names like "header" or "body"
  data: Element; // This will store the actual JSON structure
}
export interface IModification {
  modifiedBy: Types.ObjectId;
  modifiedAt: Date;
}
export interface PageDocument extends Document {
  pageName: string;
  createdBy: Types.ObjectId;
  pageType: 'page' | 'header' | 'footer' | 'blog';
  isPublished: boolean;
  isHome: boolean;
  isGlobal: boolean;
  lastModified: Date;
  preHeading: string;
  description: string;
  seoName: string;
  seoMeta: string;
  slug: string;
  component: unknown[];
  modifications: IModification[];
  createdAt?: Date;
  updatedAt?: Date;
}

<<<<<<< HEAD
export interface IBlogPostDocument extends Document {
  pageName: string; // Title of the blog post
  createdBy: Types.ObjectId;
  isPublished: boolean;
  slug: string;
  modifications: IModification[];

  excerpt?: string;
  /** Typed block body for blog posts (distinct from `component`, the visual editor's blocks). */
  contentBlocks?: ContentBlock[];
  featuredImage?: string;
  /** Legacy free-text category, kept for back-compat with existing blogs. */
  category?: string;
  /** Structured category references (Phase 2+). */
  categories?: Types.ObjectId[];
  tags?: Types.ObjectId[];
  /** Legacy free-text author name, kept for back-compat. */
  authorName?: string;
  authorId?: Types.ObjectId;
  seo?: BlogSeo;
  status?: BlogStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  /** Legacy publish timestamp, kept for back-compat. */
  publishDate?: Date;
  readingTime?: number;
  views?: number;
  /** Previous slugs, for SEO-friendly redirects (Phase 6). */
  slugHistory?: string[];
  /** When false, the public comment section is hidden for this post. */
  commentsEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---- Blog content blocks (typed body for blog posts) ----
export type BlogBlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'gallery'
  | 'video'
  | 'quote'
  | 'button'
  | 'divider'
  | 'table'
  | 'code'
  | 'faq'
  | 'newsletter'
  | 'author-box'
  | 'related-posts'
  | 'custom-html';

/**
 * A single block in a blog post body. `data` is loosely typed here; Phase 3
 * introduces a per-type discriminated union for the editors/renderers.
 */
export interface ContentBlock {
  id: string;
  type: BlogBlockType;
  data: Record<string, unknown>;
  hidden?: boolean;
}

export interface BlogSeo {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  index?: boolean;
}

export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived';

// ---- Sibling blog collection document types (stored in the page DB) ----
export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: Types.ObjectId | null;
}
export interface ICategoryDocument extends ICategory, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITag {
  name: string;
  slug: string;
}
export interface ITagDocument extends ITag, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface IAuthorSocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}
export interface IAuthor {
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
  socialLinks?: IAuthorSocialLinks;
}
export interface IAuthorDocument extends IAuthor, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type CommentStatus = 'pending' | 'approved' | 'spam';
export interface IComment {
  blogId: Types.ObjectId;
  name: string;
  email: string;
  comment: string;
  status: CommentStatus;
}
export interface ICommentDocument extends IComment, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ---- Blog design / theme settings ----
export type CardStyle = 'flat' | 'shadow' | 'bordered';
export type SidebarPosition = 'left' | 'right' | 'none';
export type DarkModePref = 'light' | 'dark' | 'auto';
export type LayoutWidthMode = 'full' | 'boxed';

export interface IBlogThemeSettings {
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number; // px
    lineHeight: number;
  };
  colors: {
    primary: string;
    background: string;
    text: string;
    accent: string;
  };
  layout: {
    width: LayoutWidthMode;
    maxWidth: number; // px, used when width = 'boxed'
  };
  radius: number; // px
  cardStyle: CardStyle;
  sidebarPosition: SidebarPosition;
  darkMode: DarkModePref;
}
export interface IBlogThemeSettingsDocument extends IBlogThemeSettings, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ---- Blog layout (section-based template page) ----
export type SectionType =
  | 'hero'
  | 'featured-post'
  | 'latest-posts'
  | 'categories'
  | 'sidebar'
  | 'newsletter'
  | 'cta'
  | 'author'
  | 'footer-cta';

export interface LayoutSection {
  id: string;
  type: SectionType;
  visible: boolean;
  settings: Record<string, unknown>;
  responsive: {
    desktop: Record<string, unknown>;
    tablet: Record<string, unknown>;
    mobile: Record<string, unknown>;
  };
}

export interface ILayout {
  name: string;
  isActive: boolean;
  sections: LayoutSection[];
}
export interface ILayoutDocument extends ILayout, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type AnalyticsEventType = 'view' | 'read' | 'search';
export interface IAnalyticsEvent {
  blogId?: Types.ObjectId;
  type: AnalyticsEventType;
  visitorId?: string;
  durationSec?: number;
  query?: string;
}
export interface IAnalyticsEventDocument extends IAnalyticsEvent, Document {
  createdAt: Date;
}

=======
>>>>>>> khadija
export interface IPlugin {
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type?: string;
  isActive: boolean;
  icon: string;
  entryPoint?: string; // Path to the JS/TS file for execution
  hasUpdate?: boolean;
}

export interface IPluginDocument extends IPlugin, Document {}

export interface ITheme {
  name: string;
  isActive: boolean;
}
export interface ISettingsDocument extends Document {
  siteTitle: string;
  language: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
  themes: ITheme[];
  aiConfig?: {
    openrouterApiKey?: string;
    openrouterModel?: string;
    openrouterReviewModel?: string;
    aiMinQualityScore?: number;
  };
}

export interface BlockData {
  id?: string;
  label?: string;
  description?: string;
  uniqueId: string;
  content: string;
  type:
    | 'column'
    | 'text'
    | 'hero'
    | 'stats'
    | 'progress'
    | 'countdown'
    | 'button'
    | 'row'
    | 'icon'
    | 'hero-main'
    | 'hero-centered'
    | 'statistics-main'
    | 'statistics-side-image'
    | 'statistics-boxed'
    | 'testimonial-main'
    | 'testimonial-single'
    | 'testimonial-single-large'
    | 'input'
    | 'radio'
    | 'checkbox'
    | 'badge'
    | 'alert'
    | 'avatar'
    | 'separator'
    | 'skeleton'
    | 'switch'
    | 'textarea'
    | 'table'
    | 'tabs'
    | 'image'
    | 'card'
    | 'shape-divider'
    | 'slider'
    | 'nav-bar'
    | 'contact'
    | 'contact-simple'
    | 'content-features'
    | 'content-gallery'
    | 'content-icons'
    | 'content-categories'
    | 'content-detail'
    | 'content-split'
    | 'content-trio'
    | 'ecommerce-grid'
    | 'ecommerce-detail'
    | 'ecommerce-info'
    | 'ecommerce-info-alt'
    | 'feature-trio'
    | 'feature-vertical'
    | 'feature-side-image'
    | 'feature-horizontal'
    | 'feature-boxed'
    | 'feature-zigzag'
    | 'feature-checklist'
    | 'feature-list'
<<<<<<< HEAD
    | 'blog-feed'
    | 'form-block';
=======
    | 'blog-feed';
>>>>>>> khadija
  children?: BlockData[][];
  style?: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
  icon?: string;
  events?: {
    onClick?: string;
    onClickValue?: string;
  };
}

export interface CanvasState {
  blocks: BlockData[];
  headerBlocks: BlockData[];
  footerBlocks: BlockData[];
  viewMode: 'desktop' | 'tablet' | 'mobile';
  selectedLabel: string;
  selectedBlock: BlockData | null;
  selectedValue: number | null;
}

export interface Page {
  id?: string;
  _id?: string; // Add MongoDB _id
  pageName: string;
<<<<<<< HEAD
  pageType: 'page' | 'header' | 'footer';
=======
  pageType: 'page' | 'header' | 'footer' | 'blog';
>>>>>>> khadija
  preHeading: string;
  description: string;
  category?: string;
  authorName?: string;
  featuredImage?: string;
  publishDate?: string;
  seoName: string;

  seoMeta: string;
  slug?: string;
  isHome?: boolean;
  isGlobal?: boolean;
  isPublished?: boolean;
  component?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  lastModified?: string;
}

export interface BlogPost {
  id?: string;
  _id?: string;
  pageName: string; // Title
  slug: string;
  excerpt?: string;
  contentBlocks?: ContentBlock[];
  featuredImage?: string;
  category?: string;
  authorName?: string;
  status?: BlogStatus;
  publishedAt?: string;
  publishDate?: string;
  readingTime?: number;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}
