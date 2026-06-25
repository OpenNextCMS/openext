// Shared blog utilities: slug generation and reading-time estimation.
// Used by the blog CRUD API (Phase 2) and the editor (Phase 4).
import type { ContentBlock } from '@/types/index';

const WORDS_PER_MINUTE = 200;

/**
 * Convert arbitrary text into a URL-safe slug.
 * "The IT — 2026!" -> "the-it-2026"
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFKD') // split accented chars into base + diacritic
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // drop non-alphanumerics
    .replace(/[\s_-]+/g, '-') // collapse whitespace/underscores to a single hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

function countWords(text: string): number {
  const cleaned = stripHtml(text).trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

/**
 * Recursively collect every string value inside a block's `data` object so
 * reading time stays accurate regardless of the block's specific shape
 * (paragraph text, table rows, FAQ items, gallery captions, etc.).
 */
function collectStrings(value: unknown, acc: string[]): void {
  if (typeof value === 'string') {
    acc.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, acc);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, acc);
  }
}

/** Total word count across all (non-hidden) content blocks. */
export function countWordsInBlocks(blocks: ContentBlock[] = []): number {
  let total = 0;
  for (const block of blocks) {
    if (block?.hidden) continue;
    const strings: string[] = [];
    collectStrings(block?.data, strings);
    for (const s of strings) total += countWords(s);
  }
  return total;
}

/** Estimated reading time in whole minutes (minimum 1). */
export function calculateReadingTime(blocks: ContentBlock[] = []): number {
  const words = countWordsInBlocks(blocks);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
