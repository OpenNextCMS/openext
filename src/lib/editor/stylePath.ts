import type { CSSProperties } from 'react';

/**
 * Helpers for reading/writing a style object stored inside a block's `content`
 * JSON at a given "part" target. A part is either:
 *   - a flat key (legacy shared text parts), e.g. `featureTitleStyle`, or
 *   - a dotted path to a per-item element style, e.g. `features.2.cardStyle`
 *     (numeric segments are array indices).
 *
 * Both the canvas reducer (`updateSelectedBlockStyles`) and the Style panels use
 * these so per-item styling works with every existing control unchanged.
 */

type AnyObj = Record<string, unknown>;

/** A flat part is normalized to end with `Style` (matches legacy behaviour). */
function normalizeFlatKey(part: string): string {
  return part.endsWith('Style') ? part : `${part}Style`;
}

/** Read the CSSProperties stored at `part` within `contentObj`. Never throws. */
export function getStyleAtPath(contentObj: unknown, part: string | null | undefined): CSSProperties {
  if (!part || !contentObj || typeof contentObj !== 'object') return {};
  // Flat (no dots) → legacy shared key.
  if (!part.includes('.')) {
    const key = normalizeFlatKey(part);
    const val = (contentObj as AnyObj)[key];
    return (val && typeof val === 'object' ? (val as CSSProperties) : {}) as CSSProperties;
  }
  // Dotted path → walk into nested objects/arrays.
  const segments = part.split('.');
  let cur: unknown = contentObj;
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') return {};
    cur = (cur as AnyObj)[seg];
  }
  return (cur && typeof cur === 'object' ? (cur as CSSProperties) : {}) as CSSProperties;
}

/**
 * Merge `payload` into the style object at `part`, mutating `contentObj`.
 * Creates intermediate objects/arrays as needed (numeric segment → array).
 */
export function setStyleAtPath(
  contentObj: AnyObj,
  part: string,
  payload: Partial<CSSProperties>
): void {
  // Flat (no dots) → legacy shared key.
  if (!part.includes('.')) {
    const key = normalizeFlatKey(part);
    const prev = (contentObj[key] && typeof contentObj[key] === 'object'
      ? (contentObj[key] as CSSProperties)
      : {}) as CSSProperties;
    contentObj[key] = { ...prev, ...payload };
    return;
  }

  const segments = part.split('.');
  let cur: AnyObj = contentObj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const nextIsIndex = /^\d+$/.test(nextSeg);
    let child = cur[seg];
    if (child == null || typeof child !== 'object') {
      child = nextIsIndex ? [] : {};
      cur[seg] = child;
    }
    cur = child as AnyObj;
  }

  const leaf = segments[segments.length - 1];
  const prev = (cur[leaf] && typeof cur[leaf] === 'object'
    ? (cur[leaf] as CSSProperties)
    : {}) as CSSProperties;
  cur[leaf] = { ...prev, ...payload };
}

const ELEMENT_LABELS: Record<string, string> = {
  cardStyle: 'Background',
  iconStyle: 'Icon',
  imageStyle: 'Image',
  buttonStyle: 'Button',
  titleStyle: 'Title',
  descriptionStyle: 'Description',
};

const ARRAY_LABELS: Record<string, string> = {
  features: 'Card',
  testimonials: 'Testimonial',
  products: 'Product',
  stats: 'Stat',
  items: 'Item',
  cards: 'Card',
  categories: 'Category',
};

/**
 * Human label for a part, used by the Style panel banner. Examples:
 *   `features.2.cardStyle` → "Card 3 — Background"
 *   `featureTitleStyle`    → "Feature title"
 */
export function prettyPartLabel(part: string | null | undefined): string {
  if (!part) return 'Entire block';
  if (part.includes('.')) {
    const segs = part.split('.');
    // pattern: <arrayKey>.<index>.<elementStyle>
    if (segs.length === 3 && /^\d+$/.test(segs[1])) {
      const noun = ARRAY_LABELS[segs[0]] || 'Item';
      const idx = Number(segs[1]) + 1;
      const el = ELEMENT_LABELS[segs[2]] || segs[2].replace(/Style$/, '');
      return `${noun} ${idx} — ${el}`;
    }
    return segs[segs.length - 1].replace(/Style$/, '');
  }
  // Flat key → spaced words.
  return part
    .replace(/Style$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
