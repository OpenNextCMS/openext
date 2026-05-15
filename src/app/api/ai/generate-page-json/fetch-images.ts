// Image enrichment: replace placeholder URLs in the Pass-1 analysis with real
// topic-relevant photos. Uses Unsplash when UNSPLASH_ACCESS_KEY is set; falls
// back to source.unsplash.com (no-auth keyword endpoint) and finally to
// picsum.photos so generation never fails on a missing image.

import type { BlockData } from '@/types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const PLACEHOLDER_HINTS = new Set([
  '',
  '/placeholder-image.png',
  '/placeholder.png',
  'placeholder',
]);

const looksLikePlaceholder = (src: unknown): boolean => {
  if (typeof src !== 'string') return true;
  const trimmed = src.trim().toLowerCase();
  if (PLACEHOLDER_HINTS.has(trimmed)) return true;
  if (trimmed.startsWith('/placeholder')) return true;
  return false;
};

const cleanQuery = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(image|photo|picture|of|the|a|an|for|with|and|or)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5)
    .join(' ');

const seededPicsumUrl = (query: string): string => {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = (hash * 31 + query.charCodeAt(i)) | 0;
  }
  return `https://picsum.photos/seed/${Math.abs(hash) || 1}/1200/800`;
};

const buildSourceUnsplashUrl = (query: string): string => {
  const encoded = encodeURIComponent(query || 'business');
  return `https://source.unsplash.com/1200x800/?${encoded}`;
};

const fetchFromUnsplashApi = async (
  query: string,
  accessKey: string
): Promise<string | null> => {
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      query
    )}&per_page=3&orientation=landscape&content_filter=high`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });
    if (!response.ok) {
      console.warn('[unsplash] non-ok response', response.status);
      return null;
    }
    const payload = (await response.json()) as UnknownRecord;
    const results = Array.isArray(payload.results) ? payload.results : [];
    const first = results[0];
    if (!isRecord(first)) return null;
    const urls = isRecord(first.urls) ? first.urls : null;
    if (!urls) return null;
    const regular = typeof urls.regular === 'string' ? urls.regular : null;
    const small = typeof urls.small === 'string' ? urls.small : null;
    return regular || small || null;
  } catch (err) {
    console.warn('[unsplash] fetch failed', err);
    return null;
  }
};

const queryCache = new Map<string, string>();

const resolveImageForQuery = async (rawQuery: string): Promise<string> => {
  const query = cleanQuery(rawQuery) || 'business modern office';
  if (queryCache.has(query)) return queryCache.get(query)!;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  let resolved: string | null = null;

  if (accessKey) {
    resolved = await fetchFromUnsplashApi(query, accessKey);
  }

  // source.unsplash.com is a redirect endpoint that works without a key. If it
  // ever stops returning images, the picsum fallback still keeps the page
  // visually complete.
  if (!resolved) {
    resolved = buildSourceUnsplashUrl(query);
  }

  // Final safety net — always returns a valid image.
  if (!resolved) {
    resolved = seededPicsumUrl(query);
  }

  queryCache.set(query, resolved);
  return resolved;
};

const buildElementQuery = (
  element: UnknownRecord,
  sectionName: string,
  topic: string
): string => {
  const imageAlt = typeof element.imageAlt === 'string' ? element.imageAlt : '';
  if (imageAlt) return imageAlt;

  const cardData = isRecord(element.cardData) ? element.cardData : null;
  if (cardData) {
    const title = typeof cardData.title === 'string' ? cardData.title : '';
    const eyebrow = typeof cardData.eyebrow === 'string' ? cardData.eyebrow : '';
    if (title || eyebrow) return [eyebrow, title].filter(Boolean).join(' ');
  }

  const text = typeof element.text === 'string' ? element.text : '';
  if (text) return text;

  return [sectionName, topic].filter(Boolean).join(' ');
};

// Walk the Pass-1 analysis. For every image/card element with a placeholder
// image, swap in a real photo URL based on the element's alt text or its
// surrounding card fields. Returns a NEW analysis object — does not mutate.
export const enrichAnalysisWithImages = async <T>(
  analysis: T,
  topicHint: string
): Promise<T> => {
  if (!isRecord(analysis)) return analysis;
  const sections = Array.isArray(analysis.sections) ? analysis.sections : null;
  if (!sections) return analysis;

  const enrichedSections: unknown[] = [];

  for (const section of sections) {
    if (!isRecord(section)) {
      enrichedSections.push(section);
      continue;
    }
    const sectionName = typeof section.name === 'string' ? section.name : '';
    const elements = Array.isArray(section.elements) ? section.elements : [];

    const enrichedElements = await Promise.all(
      elements.map(async (element) => {
        if (!isRecord(element)) return element;
        const blockId = typeof element.blockId === 'string' ? element.blockId : '';

        // Image blocks: look for element.imageSrc, fall through if placeholder.
        if (blockId === 'image') {
          const currentSrc = typeof element.imageSrc === 'string' ? element.imageSrc : '';
          if (looksLikePlaceholder(currentSrc)) {
            const query = buildElementQuery(element, sectionName, topicHint);
            const realSrc = await resolveImageForQuery(query);
            return { ...element, imageSrc: realSrc };
          }
          return element;
        }

        // Card blocks: cardData.image carries the URL.
        if (blockId === 'card') {
          const cardData = isRecord(element.cardData) ? element.cardData : {};
          const currentImage =
            typeof cardData.image === 'string' ? cardData.image : '';
          if (looksLikePlaceholder(currentImage)) {
            const query = buildElementQuery(element, sectionName, topicHint);
            const realSrc = await resolveImageForQuery(query);
            return { ...element, cardData: { ...cardData, image: realSrc } };
          }
          return element;
        }

        return element;
      })
    );

    enrichedSections.push({ ...section, elements: enrichedElements });
  }

  return { ...analysis, sections: enrichedSections } as T;
};

// ---------------------------------------------------------------------------
// Post-Pass-2 enrichment: walk the final BlockData tree and replace any
// placeholder URLs that survived (or were never enriched upstream). This is
// the authoritative pass — it doesn't matter what the planner or generator
// produced as long as content is a valid JSON shape with src/image.
// ---------------------------------------------------------------------------

const parseJsonContent = (content: unknown): UnknownRecord | null => {
  if (typeof content !== 'string') return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const queryForImageBlock = (parsedContent: UnknownRecord, topic: string): string => {
  const alt = typeof parsedContent.alt === 'string' ? parsedContent.alt : '';
  const caption = typeof parsedContent.caption === 'string' ? parsedContent.caption : '';
  return [alt, caption, topic].filter(Boolean).join(' ');
};

const queryForCardBlock = (parsedContent: UnknownRecord, topic: string): string => {
  const eyebrow = typeof parsedContent.eyebrow === 'string' ? parsedContent.eyebrow : '';
  const title = typeof parsedContent.title === 'string' ? parsedContent.title : '';
  const body = typeof parsedContent.body === 'string' ? parsedContent.body : '';
  return [eyebrow, title, body.slice(0, 60), topic].filter(Boolean).join(' ');
};

// Recursively walks BlockData[]. For each image/card block whose content has a
// placeholder src/image, replaces it with a real photo URL. Mutates a clone —
// the input tree is left untouched.
export const enrichComponentsWithImages = async (
  components: BlockData[],
  topic: string
): Promise<BlockData[]> => {
  const enrichOne = async (block: BlockData): Promise<BlockData> => {
    let nextContent = block.content;

    if (block.type === 'image') {
      const parsed = parseJsonContent(block.content);
      if (parsed) {
        const currentSrc = typeof parsed.src === 'string' ? parsed.src : '';
        if (looksLikePlaceholder(currentSrc)) {
          const query = queryForImageBlock(parsed, topic);
          const realSrc = await resolveImageForQuery(query);
          nextContent = JSON.stringify({ ...parsed, src: realSrc });
        }
      } else if (looksLikePlaceholder(block.content)) {
        // content was a plain string placeholder, not JSON — wrap as JSON.
        const realSrc = await resolveImageForQuery(topic);
        nextContent = JSON.stringify({ src: realSrc, alt: topic, caption: '' });
      }
    } else if (block.type === 'card') {
      const parsed = parseJsonContent(block.content);
      if (parsed) {
        const currentImage = typeof parsed.image === 'string' ? parsed.image : '';
        if (looksLikePlaceholder(currentImage)) {
          const query = queryForCardBlock(parsed, topic);
          const realSrc = await resolveImageForQuery(query);
          nextContent = JSON.stringify({ ...parsed, image: realSrc });
        }
      }
    }

    const nextChildren = block.children
      ? await Promise.all(
          block.children.map((column) =>
            Promise.all(column.map((child) => enrichOne(child)))
          )
        )
      : undefined;

    return nextChildren
      ? { ...block, content: nextContent, children: nextChildren }
      : { ...block, content: nextContent };
  };

  return Promise.all(components.map(enrichOne));
};
