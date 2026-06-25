import { v4 as uuidv4 } from 'uuid';
import type { BlogBlockType } from '@/types/index';

// ---- Per-type data shapes (the discriminated union for blog content blocks) ----
export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
export type ButtonStyle = 'primary' | 'secondary' | 'outline';
export type VideoProvider = 'youtube' | 'vimeo' | 'file';

export interface HeadingData {
  text: string;
  level: HeadingLevel;
}
export interface ParagraphData {
  text: string;
}
export interface ImageData {
  url: string;
  alt: string;
  caption?: string;
}
export interface GalleryData {
  images: { url: string; alt: string }[];
}
export interface VideoData {
  url: string;
  provider: VideoProvider;
}
export interface QuoteData {
  text: string;
  cite?: string;
}
export interface ButtonData {
  label: string;
  href: string;
  style: ButtonStyle;
}
export type DividerData = Record<string, never>;
export interface TableData {
  rows: string[][];
  hasHeader: boolean;
}
export interface CodeData {
  code: string;
  language: string;
}
export interface FaqData {
  items: { q: string; a: string }[];
}
export interface NewsletterData {
  heading: string;
  placeholder: string;
  buttonLabel: string;
}
export interface AuthorBoxData {
  authorId: string;
}
export interface RelatedPostsData {
  count: number;
  categoryId?: string;
}
export interface CustomHtmlData {
  html: string;
}

/** Map each block type to its `data` shape. */
export interface BlockDataMap {
  heading: HeadingData;
  paragraph: ParagraphData;
  image: ImageData;
  gallery: GalleryData;
  video: VideoData;
  quote: QuoteData;
  button: ButtonData;
  divider: DividerData;
  table: TableData;
  code: CodeData;
  faq: FaqData;
  newsletter: NewsletterData;
  'author-box': AuthorBoxData;
  'related-posts': RelatedPostsData;
  'custom-html': CustomHtmlData;
}

/** A fully-typed blog content block (discriminated on `type`). */
export type BlogBlock = {
  [K in BlogBlockType]: { id: string; type: K; hidden?: boolean; data: BlockDataMap[K] };
}[BlogBlockType];

/** Display metadata for the "Add block" menu, grouped by category. */
export const BLOCK_META: Record<BlogBlockType, { label: string; group: string }> = {
  heading: { label: 'Heading', group: 'Text' },
  paragraph: { label: 'Paragraph', group: 'Text' },
  quote: { label: 'Quote', group: 'Text' },
  code: { label: 'Code', group: 'Text' },
  image: { label: 'Image', group: 'Media' },
  gallery: { label: 'Gallery', group: 'Media' },
  video: { label: 'Video', group: 'Media' },
  table: { label: 'Table', group: 'Layout' },
  divider: { label: 'Divider', group: 'Layout' },
  button: { label: 'Button', group: 'Layout' },
  faq: { label: 'FAQ', group: 'Dynamic' },
  newsletter: { label: 'Newsletter', group: 'Dynamic' },
  'author-box': { label: 'Author Box', group: 'Dynamic' },
  'related-posts': { label: 'Related Posts', group: 'Dynamic' },
  'custom-html': { label: 'Custom HTML', group: 'Advanced' },
};

export const BLOCK_TYPES = Object.keys(BLOCK_META) as BlogBlockType[];

/** Default `data` for a freshly inserted block of each type. */
export const DEFAULT_BLOCK_DATA: { [K in BlogBlockType]: () => BlockDataMap[K] } = {
  heading: () => ({ text: 'New heading', level: 'h2' }),
  paragraph: () => ({ text: '<p>Write something…</p>' }),
  image: () => ({ url: '', alt: '' }),
  gallery: () => ({ images: [] }),
  video: () => ({ url: '', provider: 'youtube' }),
  quote: () => ({ text: 'A memorable quote.', cite: '' }),
  button: () => ({ label: 'Click me', href: '#', style: 'primary' }),
  divider: () => ({}) as DividerData,
  table: () => ({ rows: [['', '']], hasHeader: true }),
  code: () => ({ code: '', language: 'javascript' }),
  faq: () => ({ items: [{ q: '', a: '' }] }),
  newsletter: () => ({
    heading: 'Subscribe to our newsletter',
    placeholder: 'you@example.com',
    buttonLabel: 'Subscribe',
  }),
  'author-box': () => ({ authorId: '' }),
  'related-posts': () => ({ count: 3 }),
  'custom-html': () => ({ html: '' }),
};

/** Create a new block instance with a generated id and default data. */
export function createBlock<K extends BlogBlockType>(type: K): Extract<BlogBlock, { type: K }> {
  return {
    id: uuidv4(),
    type,
    data: DEFAULT_BLOCK_DATA[type](),
  } as unknown as Extract<BlogBlock, { type: K }>;
}
