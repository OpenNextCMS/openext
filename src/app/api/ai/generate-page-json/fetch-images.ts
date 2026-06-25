// Image enrichment: replace placeholder URLs with topic-relevant photos.
// Lookup order:
//   1. Unsplash API search (best results, requires UNSPLASH_ACCESS_KEY env).
//   2. LoremFlickr — Flickr photos tagged with the query keywords; no key
//      needed, free, works for most common business/topic words.
//
// Query construction strategy: rather than mashing the alt text together with
// the brand and prompt (which produces useless tags like "story,aviral,trendz"
// for an IT site about page), we infer the SITE'S INDUSTRY from the prompt
// once, then build photo queries as INDUSTRY_TAGS + per-image ROLE_TAGS
// (hero/about/portrait/etc.). Brand names and marketing copy never reach the
// photo search, so images always match the site's actual subject matter.

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

// ---------------------------------------------------------------------------
// Industry detection — pick photo tags that match the site's subject matter.
// First matching rule wins; default fallback is generic business imagery.
// ---------------------------------------------------------------------------
const INDUSTRY_RULES: Array<{ test: RegExp; tags: string[] }> = [
  { test: /\b(it|software|saas|cloud|devops|cyber|security|developer|programming|programmer|api|database|server|tech|startup|fintech|crypto|blockchain|ai|ml)\b/i, tags: ['technology', 'office', 'computer'] },
  { test: /\b(restaurant|cafe|bistro|chef|menu|bakery|cuisine|dining|catering|food|kitchen)\b/i, tags: ['restaurant', 'food', 'cuisine'] },
  { test: /\b(coffee|barista|espresso|brew|roastery)\b/i, tags: ['coffee', 'cafe', 'barista'] },
  { test: /\b(fitness|gym|yoga|workout|athletic|trainer|crossfit|pilates)\b/i, tags: ['fitness', 'gym', 'workout'] },
  { test: /\b(fashion|clothing|apparel|jewelry|model|boutique|couture|streetwear)\b/i, tags: ['fashion', 'clothing', 'model'] },
  { test: /\b(real\s?estate|property|housing|realtor|apartment|architecture)\b/i, tags: ['architecture', 'building', 'realestate'] },
  { test: /\b(medical|doctor|health|wellness|clinic|hospital|dental|pharmacy|therapy)\b/i, tags: ['medical', 'healthcare', 'hospital'] },
  { test: /\b(law|legal|attorney|lawyer|firm|paralegal)\b/i, tags: ['law', 'office', 'business'] },
  { test: /\b(education|school|university|teacher|student|course|academy|learning|tutor)\b/i, tags: ['education', 'classroom', 'student'] },
  { test: /\b(travel|hotel|tourism|vacation|airline|booking|resort|cruise)\b/i, tags: ['travel', 'tourism', 'destination'] },
  { test: /\b(finance|banking|investment|insurance|trading|accounting)\b/i, tags: ['finance', 'business', 'office'] },
  { test: /\b(ecommerce|shop|store|retail|product|marketplace)\b/i, tags: ['shopping', 'retail', 'product'] },
  { test: /\b(agency|creative|design|marketing|branding|advertising)\b/i, tags: ['creative', 'design', 'office'] },
  { test: /\b(portfolio|photographer|artist|designer|illustrator)\b/i, tags: ['portfolio', 'art', 'creative'] },
  { test: /\b(beauty|salon|spa|hair|cosmetics|makeup|skincare)\b/i, tags: ['beauty', 'salon', 'spa'] },
  { test: /\b(automotive|car|vehicle|garage|mechanic|dealership)\b/i, tags: ['automotive', 'car', 'vehicle'] },
  { test: /\b(construction|builder|contractor|renovation|carpentry)\b/i, tags: ['construction', 'building', 'tools'] },
  { test: /\b(music|band|concert|studio|recording|dj)\b/i, tags: ['music', 'concert', 'studio'] },
  { test: /\b(pet|veterinary|dog|cat|animal)\b/i, tags: ['pet', 'animal', 'veterinary'] },
  { test: /\b(consulting|consultant|advisory|strategy)\b/i, tags: ['business', 'meeting', 'office'] },
  { test: /\b(non[- ]?profit|charity|foundation|community)\b/i, tags: ['community', 'volunteer', 'people'] },
];

export const inferIndustryTags = (prompt: string): string[] => {
  if (!prompt) return ['business', 'office', 'professional'];
  for (const { test, tags } of INDUSTRY_RULES) {
    if (test.test(prompt)) return tags;
  }
  return ['business', 'office', 'professional'];
};

// ---------------------------------------------------------------------------
// Role-tag extraction from alt text — recognizes what KIND of photo each
// image block expects (hero banner, portrait, dashboard screen, etc.).
// ---------------------------------------------------------------------------
const ROLE_RULES: Array<{ test: RegExp; tags: string[] }> = [
  { test: /\b(portrait|headshot|avatar|profile|team\s?member|employee|staff)\b/i, tags: ['portrait', 'professional'] },
  { test: /\bdashboard|preview|interface|screen|app\b/i, tags: ['laptop', 'screen'] },
  { test: /\b(gallery|portfolio|work|project)\b/i, tags: ['workspace', 'creative'] },
  { test: /\b(logo|brand|trustedby|partner|client)\b/i, tags: ['logo', 'minimal'] },
  { test: /\bhero|banner|cover\b/i, tags: ['modern'] },
  { test: /\b(about|story|founder|history)\b/i, tags: ['team', 'collaboration'] },
  { test: /\b(service|feature|solution)\b/i, tags: ['professional'] },
  { test: /\b(contact|location|map)\b/i, tags: ['office', 'workspace'] },
];

const extractRoleTags = (text: string): string[] => {
  if (!text) return [];
  for (const { test, tags } of ROLE_RULES) {
    if (test.test(text)) return tags;
  }
  return [];
};

// ---------------------------------------------------------------------------
// Query construction — combines industry tags (primary) with role tags
// (secondary). Brand names and marketing copy are deliberately excluded.
// ---------------------------------------------------------------------------
const buildPhotoTags = (industryTags: string[], roleHint: string): string[] => {
  const role = extractRoleTags(roleHint);
  // Take up to 2 industry tags + 1 role tag → 3 distinct keywords total.
  const merged: string[] = [];
  const seen = new Set<string>();
  const push = (t: string) => {
    if (!t) return;
    const lower = t.toLowerCase();
    if (seen.has(lower)) return;
    seen.add(lower);
    merged.push(lower);
  };
  industryTags.slice(0, 2).forEach(push);
  role.slice(0, 1).forEach(push);
  // If we somehow ended up empty, fall back to a sensible default.
  if (!merged.length) {
    ['business', 'office'].forEach(push);
  }
  return merged.slice(0, 3);
};

const stringHash = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
};

const buildLoremFlickrUrl = (tags: string[], seedSource: string): string => {
  const tagPart = tags.length ? tags.join(',') : 'business,office';
  const seed = stringHash(seedSource || tagPart);
  return `https://loremflickr.com/1200/800/${encodeURIComponent(tagPart)}?lock=${seed}`;
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

const resolveImageForTags = async (tags: string[], seedSource: string): Promise<string> => {
  const cacheKey = `${tags.join(',')}|${seedSource}`;
  if (queryCache.has(cacheKey)) return queryCache.get(cacheKey)!;

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  let resolved: string | null = null;

  if (accessKey) {
    resolved = await fetchFromUnsplashApi(tags.join(' '), accessKey);
  }

  if (!resolved) {
    resolved = buildLoremFlickrUrl(tags, seedSource);
  }

  queryCache.set(cacheKey, resolved);
  return resolved;
};

// ---------------------------------------------------------------------------
// Public: enrich the analysis pass-1 output (legacy "sections[]" shape).
// Kept for backward compatibility; new site-mode flow uses the components
// enrichment below.
// ---------------------------------------------------------------------------
export const enrichAnalysisWithImages = async <T>(
  analysis: T,
  topicHint: string
): Promise<T> => {
  if (!isRecord(analysis)) return analysis;
  const sections = Array.isArray(analysis.sections) ? analysis.sections : null;
  if (!sections) return analysis;

  const industryTags = inferIndustryTags(topicHint);
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
        const roleHint =
          (typeof element.imageAlt === 'string' ? element.imageAlt : '') ||
          (typeof element.text === 'string' ? element.text : '') ||
          sectionName;
        const tags = buildPhotoTags(industryTags, roleHint);

        if (blockId === 'image') {
          const currentSrc = typeof element.imageSrc === 'string' ? element.imageSrc : '';
          if (looksLikePlaceholder(currentSrc)) {
            const realSrc = await resolveImageForTags(tags, roleHint);
            return { ...element, imageSrc: realSrc };
          }
          return element;
        }

        if (blockId === 'card') {
          const cardData = isRecord(element.cardData) ? element.cardData : {};
          const currentImage =
            typeof cardData.image === 'string' ? cardData.image : '';
          if (looksLikePlaceholder(currentImage)) {
            const cardRoleHint =
              (typeof cardData.title === 'string' ? cardData.title : '') ||
              (typeof cardData.eyebrow === 'string' ? cardData.eyebrow : '') ||
              roleHint;
            const cardTags = buildPhotoTags(industryTags, cardRoleHint);
            const realSrc = await resolveImageForTags(cardTags, cardRoleHint);
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
// Public: enrich the final BlockData tree. Walks every image/card block and
// fills empty/placeholder URLs with topic-relevant photos.
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

export const enrichComponentsWithImages = async (
  components: BlockData[],
  topic: string,
  industryTagsArg?: string[]
): Promise<BlockData[]> => {
  const industryTags =
    industryTagsArg && industryTagsArg.length ? industryTagsArg : inferIndustryTags(topic);

  const enrichOne = async (block: BlockData): Promise<BlockData> => {
    let nextContent = block.content;

    if (block.type === 'image') {
      const parsed = parseJsonContent(block.content);
      if (parsed) {
        const currentSrc = typeof parsed.src === 'string' ? parsed.src : '';
        if (looksLikePlaceholder(currentSrc)) {
          const alt = typeof parsed.alt === 'string' ? parsed.alt : '';
          const tags = buildPhotoTags(industryTags, alt);
          const realSrc = await resolveImageForTags(tags, alt || tags.join(','));
          nextContent = JSON.stringify({ ...parsed, src: realSrc });
        }
      } else if (looksLikePlaceholder(block.content)) {
        const tags = buildPhotoTags(industryTags, '');
        const realSrc = await resolveImageForTags(tags, topic);
        nextContent = JSON.stringify({ src: realSrc, alt: topic, caption: '' });
      }
    } else if (block.type === 'card') {
      const parsed = parseJsonContent(block.content);
      if (parsed) {
        const currentImage = typeof parsed.image === 'string' ? parsed.image : '';
        if (looksLikePlaceholder(currentImage)) {
          const roleHint =
            (typeof parsed.eyebrow === 'string' ? parsed.eyebrow : '') ||
            (typeof parsed.title === 'string' ? parsed.title : '');
          const tags = buildPhotoTags(industryTags, roleHint);
          const realSrc = await resolveImageForTags(tags, roleHint || tags.join(','));
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
