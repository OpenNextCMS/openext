import { classifyNiche } from './playbooks';
import { formatResearchBriefCompact } from './site-prompt-compact';
import type {
  ResearchBrief,
  ResearchPalette,
  ResearchReference,
  ResearchPageHint,
} from './types';

export { formatResearchBriefCompact as formatResearchBriefForPrompt };

const MAX_REFS = 8;
const FETCH_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 600_000;
const MIN_SUCCESSFUL_FETCHES = 3;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const PAGE_ALIASES: Array<{ label: string; test: RegExp }> = [
  { label: 'home', test: /\b(home|index)\b/i },
  { label: 'about', test: /\b(about|our\s+story|company|who\s+we\s+are)\b/i },
  { label: 'services', test: /\b(services?|solutions?|what\s+we\s+do|offerings?)\b/i },
  { label: 'features', test: /\b(features?|product|capabilities)\b/i },
  { label: 'pricing', test: /\b(pricing|plans?|membership)\b/i },
  { label: 'portfolio', test: /\b(work|portfolio|projects?|case\s+studies)\b/i },
  { label: 'blog', test: /\b(blog|news|resources?|insights?)\b/i },
  { label: 'contact', test: /\b(contact|get\s+in\s+touch|support)\b/i },
  { label: 'team', test: /\b(team|people|leadership)\b/i },
  { label: 'menu', test: /\b(menu|food|drinks?)\b/i },
  { label: 'shop', test: /\b(shop|store|products?|buy)\b/i },
  { label: 'faq', test: /\b(faq|help|questions?)\b/i },
  { label: 'careers', test: /\b(careers?|jobs?|hiring)\b/i },
];

const SECTION_ALIASES: Array<{ label: string; test: RegExp }> = [
  { label: 'hero', test: /\b(hero|headline|get\s+started|book\s+a\s+demo|try\s+free)\b/i },
  { label: 'trustedBy', test: /\b(trusted\s+by|customers?|partners?|logos?)\b/i },
  { label: 'features', test: /\b(features?|benefits?|why\s+us|capabilities)\b/i },
  { label: 'services', test: /\b(services?|solutions?|what\s+we\s+offer)\b/i },
  { label: 'stats', test: /\b(\d+%|\d+\+|metrics?|numbers?|results?)\b/i },
  { label: 'testimonials', test: /\b(testimonial|review|customers?\s+say|loved\s+by)\b/i },
  { label: 'pricing', test: /\b(pricing|plans?|\$\d+)\b/i },
  { label: 'faq', test: /\b(faq|frequently\s+asked|questions?)\b/i },
  { label: 'cta', test: /\b(get\s+started|book|contact\s+us|request\s+a\s+demo|sign\s+up)\b/i },
  { label: 'team', test: /\b(our\s+team|meet\s+the|leadership)\b/i },
  { label: 'about', test: /\b(about\s+us|our\s+story|mission|vision)\b/i },
  { label: 'gallery', test: /\b(gallery|photos?|lookbook)\b/i },
  { label: 'process', test: /\b(how\s+it\s+works|process|steps?)\b/i },
  { label: 'contact', test: /\b(contact|email|phone|address|location)\b/i },
  { label: 'newsletter', test: /\b(newsletter|subscribe|stay\s+updated)\b/i },
];

type DiscoveredUrl = { url: string; reason?: string };

type ParsedSite = {
  url: string;
  hostname: string;
  title: string;
  pagesSeen: string[];
  sectionsSeen: string[];
  colors: string[];
};

const normalizeUrl = (raw: string): string | null => {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProtocol);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    // Prefer origin homepage for structure sampling
    return u.origin + '/';
  } catch {
    return null;
  }
};

const hostnameOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const decodeHtmlEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const stripTags = (html: string) =>
  decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());

const extractMetaContent = (html: string, nameOrProp: string): string => {
  const re = new RegExp(
    `<meta[^>]*(?:name|property)=["']${nameOrProp}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']${nameOrProp}["'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  return decodeHtmlEntities((m?.[1] || m?.[2] || '').trim());
};

const extractTitle = (html: string): string => {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return decodeHtmlEntities((m?.[1] || '').replace(/\s+/g, ' ').trim());
};

const extractNavLabels = (html: string): string[] => {
  const labels: string[] = [];
  const navChunks = html.match(/<nav[\s\S]*?<\/nav>/gi) || [];
  const headerChunks = html.match(/<header[\s\S]*?<\/header>/gi) || [];
  const chunks = [...navChunks, ...headerChunks].slice(0, 4);
  for (const chunk of chunks) {
    const linkRe = /<a[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(chunk))) {
      const text = stripTags(m[1]).slice(0, 40);
      if (text && text.length > 1 && text.length < 32) labels.push(text);
    }
  }
  return [...new Set(labels)].slice(0, 24);
};

const extractHeadings = (html: string): string[] => {
  const out: string[] = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTags(m[1]).slice(0, 80);
    if (text) out.push(text);
    if (out.length >= 20) break;
  }
  return out;
};

const extractHexColors = (html: string): string[] => {
  const colors = new Set<string>();
  const theme = extractMetaContent(html, 'theme-color');
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(theme)) {
    colors.add(normalizeHex(theme));
  }
  const hexRe = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = hexRe.exec(html)) && count < 80) {
    colors.add(normalizeHex(m[0]));
    count += 1;
  }
  return [...colors].slice(0, 24);
};

const normalizeHex = (hex: string): string => {
  let h = hex.trim().toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return h;
};

const mapLabels = (
  texts: string[],
  aliases: Array<{ label: string; test: RegExp }>
): string[] => {
  const found = new Set<string>();
  const blob = texts.join(' | ');
  for (const { label, test } of aliases) {
    if (test.test(blob)) found.add(label);
  }
  for (const text of texts) {
    for (const { label, test } of aliases) {
      if (test.test(text)) found.add(label);
    }
  }
  return [...found];
};

const fetchHtml = async (url: string): Promise<string | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'OpenNextCMS-SiteResearch/1.0 (+https://localhost; research for website generation)',
      },
    });
    if (!res.ok) return null;
    const ctype = res.headers.get('content-type') || '';
    if (ctype && !/text\/html|application\/xhtml/i.test(ctype)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_HTML_BYTES) {
      return buf.subarray(0, MAX_HTML_BYTES).toString('utf8');
    }
    return buf.toString('utf8');
  } catch (err) {
    console.warn('[research] fetch failed', url, err);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const parseSiteHtml = (url: string, html: string): ParsedSite => {
  const title = extractTitle(html) || hostnameOf(url);
  const navLabels = extractNavLabels(html);
  const headings = extractHeadings(html);
  const bodySample = stripTags(html).slice(0, 4000);
  const pagesSeen = mapLabels([...navLabels, title], PAGE_ALIASES);
  const sectionsSeen = mapLabels([...headings, bodySample, ...navLabels], SECTION_ALIASES);
  const colors = extractHexColors(html);

  return {
    url,
    hostname: hostnameOf(url),
    title,
    pagesSeen,
    sectionsSeen,
    colors,
  };
};

const discoverReferenceUrls = async ({
  prompt,
  playbookQueries,
  apiKey,
  model,
}: {
  prompt: string;
  playbookQueries: string[];
  apiKey: string;
  model: string;
}): Promise<DiscoveredUrl[]> => {
  if (!apiKey) return [];

  const system = `Return ONLY JSON: {"urls":[{"url":"https://example.com"}]}
Give 6-8 real https company/product homepages for the niche. No wiki/social/directories. No duplicates. No invented domains.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `${prompt}\nHints: ${playbookQueries.slice(0, 2).join('; ')}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.warn('[research] discover failed', res.status);
      return [];
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json?.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return [];
    }
    const urlsRaw =
      parsed && typeof parsed === 'object' && Array.isArray((parsed as { urls?: unknown }).urls)
        ? ((parsed as { urls: unknown[] }).urls as unknown[])
        : [];
    const out: DiscoveredUrl[] = [];
    const seenHost = new Set<string>();
    for (const item of urlsRaw) {
      const url =
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && typeof (item as { url?: string }).url === 'string'
            ? (item as { url: string }).url
            : '';
      const reason =
        item && typeof item === 'object' && typeof (item as { reason?: string }).reason === 'string'
          ? (item as { reason: string }).reason
          : undefined;
      const normalized = normalizeUrl(url);
      if (!normalized) continue;
      const host = hostnameOf(normalized);
      if (seenHost.has(host)) continue;
      seenHost.add(host);
      out.push({ url: normalized, reason });
      if (out.length >= MAX_REFS) break;
    }
    return out;
  } catch (err) {
    console.warn('[research] discover error', err);
    return [];
  }
};

const mergePageHints = (
  playbookPages: ResearchPageHint[],
  consensusPages: string[]
): ResearchPageHint[] => {
  const bySlug = new Map<string, ResearchPageHint>();
  for (const p of playbookPages) bySlug.set(p.slug, p);

  const slugFor = (label: string): ResearchPageHint | null => {
    if (label === 'home') return { slug: 'home', title: 'Home', reason: 'Common across references' };
    if (label === 'about') return { slug: 'about', title: 'About', reason: 'Seen on reference sites' };
    if (label === 'services' || label === 'solutions')
      return { slug: 'services', title: 'Services', reason: 'Seen on reference sites' };
    if (label === 'features')
      return { slug: 'features', title: 'Features', reason: 'Seen on reference sites' };
    if (label === 'pricing')
      return { slug: 'pricing', title: 'Pricing', reason: 'Seen on reference sites' };
    if (label === 'portfolio' || label === 'work')
      return { slug: 'work', title: 'Work', reason: 'Seen on reference sites' };
    if (label === 'contact')
      return { slug: 'contact', title: 'Contact', reason: 'Seen on reference sites' };
    if (label === 'menu') return { slug: 'menu', title: 'Menu', reason: 'Seen on reference sites' };
    if (label === 'shop') return { slug: 'shop', title: 'Shop', reason: 'Seen on reference sites' };
    if (label === 'faq') return { slug: 'faq', title: 'FAQ', reason: 'Seen on reference sites' };
    return null;
  };

  for (const label of consensusPages) {
    const hint = slugFor(label);
    if (hint && !bySlug.has(hint.slug)) bySlug.set(hint.slug, hint);
  }

  // Ensure core floor
  for (const required of ['home', 'about', 'contact'] as const) {
    if (!bySlug.has(required)) {
      bySlug.set(required, {
        slug: required,
        title: required[0].toUpperCase() + required.slice(1),
        reason: 'Default floor page',
      });
    }
  }
  if (![...bySlug.keys()].some((s) => ['services', 'features', 'menu', 'shop', 'work'].includes(s))) {
    bySlug.set('services', {
      slug: 'services',
      title: 'Services',
      reason: 'Default offerings page',
    });
  }

  const preferred = ['home', 'about', 'services', 'features', 'pricing', 'work', 'menu', 'shop', 'faq', 'contact'];
  return [...bySlug.values()]
    .sort((a, b) => preferred.indexOf(a.slug) - preferred.indexOf(b.slug))
    .slice(0, 5);
};

const mergeHomeSections = (playbookOrder: string[], consensus: string[]): string[] => {
  const mapped = consensus.map((s) => {
    if (s === 'hero') return 'heroSplit';
    return s;
  });
  const out: string[] = [];
  const push = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };
  // Start with research consensus where available, else playbook
  if (mapped.length >= 4) {
    mapped.forEach(push);
    playbookOrder.forEach(push);
  } else {
    playbookOrder.forEach(push);
    mapped.forEach(push);
  }
  return out.slice(0, 10);
};

const scoreColor = (hex: string): number => {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Prefer mid/high chroma accents (not near gray, not pure white/black)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (lum < 20 || lum > 245) return sat * 0.2;
  return sat * 2 + (lum > 40 && lum < 200 ? 1 : 0);
};

const pickPalette = (
  sites: ParsedSite[],
  fallback: Omit<ResearchPalette, 'confidence'>
): ResearchPalette => {
  const colorVotes = new Map<string, number>();
  for (const site of sites) {
    for (const c of site.colors) {
      colorVotes.set(c, (colorVotes.get(c) || 0) + 1 + scoreColor(c));
    }
  }

  const ranked = [...colorVotes.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  if (ranked.length < 2) {
    return { ...fallback, confidence: 'low' };
  }

  const primaryColor = ranked.find((c) => scoreColor(c) > 0.8) || ranked[0] || fallback.primaryColor;
  const secondaryColor =
    ranked.find((c) => c !== primaryColor && scoreColor(c) > 0.3) ||
    fallback.secondaryColor;
  const backgroundColor =
    ranked.find((c) => {
      const h = c.slice(1);
      const lum =
        0.2126 * parseInt(h.slice(0, 2), 16) +
        0.7152 * parseInt(h.slice(2, 4), 16) +
        0.0722 * parseInt(h.slice(4, 6), 16);
      return lum > 220;
    }) ||
    fallback.backgroundColor;
  const textColor =
    ranked.find((c) => {
      const h = c.slice(1);
      const lum =
        0.2126 * parseInt(h.slice(0, 2), 16) +
        0.7152 * parseInt(h.slice(2, 4), 16) +
        0.0722 * parseInt(h.slice(4, 6), 16);
      return lum < 60;
    }) ||
    fallback.textColor;

  return {
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    fontFamily: fallback.fontFamily,
    mood: fallback.mood,
    confidence: ranked.length >= 6 ? 'high' : 'medium',
  };
};

const frequencyRank = (lists: string[][]): string[] => {
  const counts = new Map<string, number>();
  for (const list of lists) {
    for (const item of [...new Set(list)]) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
};

/**
 * Hybrid research: industry playbook + live sample of reference sites.
 * Never throws — always returns a usable ResearchBrief (playbook-only fallback).
 */
export async function buildResearchBrief({
  prompt,
  apiKey,
  model,
}: {
  prompt: string;
  apiKey: string;
  model: string;
}): Promise<ResearchBrief> {
  const playbook = classifyNiche(prompt);
  const insights: string[] = [
    `Matched playbook: ${playbook.label} (${playbook.id})`,
    `Tone: ${playbook.tone}`,
  ];

  const discovered = await discoverReferenceUrls({
    prompt,
    playbookQueries: playbook.searchQueries,
    apiKey,
    model,
  });

  const parsedSites: ParsedSite[] = [];
  if (discovered.length) {
    const results = await Promise.all(
      discovered.slice(0, MAX_REFS).map(async (d) => {
        const html = await fetchHtml(d.url);
        if (!html) return null;
        return parseSiteHtml(d.url, html);
      })
    );
    for (const site of results) {
      if (site) parsedSites.push(site);
    }
  }

  const references: ResearchReference[] = parsedSites.map((s) => ({
    url: s.url,
    hostname: s.hostname,
    title: s.title,
    pagesSeen: s.pagesSeen,
    sectionsSeen: s.sectionsSeen,
  }));

  const consensusPages = frequencyRank(parsedSites.map((s) => s.pagesSeen));
  const consensusSections = frequencyRank(parsedSites.map((s) => s.sectionsSeen));

  if (consensusPages.length) {
    insights.push(`Common pages across refs: ${consensusPages.slice(0, 8).join(', ')}`);
  }
  if (consensusSections.length) {
    insights.push(`Common home sections: ${consensusSections.slice(0, 8).join(', ')}`);
  }
  if (references.length) {
    insights.push(
      `Studied ${references.length} live sites: ${references
        .slice(0, 8)
        .map((r) => r.hostname)
        .join(', ')}`
    );
  } else {
    insights.push('Live research returned few/no pages — using playbook patterns only.');
  }

  const recommendedPages = mergePageHints(playbook.pages, consensusPages);
  const homeSectionOrder = mergeHomeSections(playbook.homeSectionOrder, consensusSections);
  const palette = pickPalette(parsedSites, playbook.palette);

  insights.push(
    `Palette confidence: ${palette.confidence} (primary ${palette.primaryColor}, secondary ${palette.secondaryColor})`
  );

  return {
    niche: playbook.label,
    playbookId: playbook.id,
    references,
    recommendedPages,
    homeSectionOrder,
    palette,
    insights,
    source: parsedSites.length >= MIN_SUCCESSFUL_FETCHES ? 'hybrid' : 'playbook_only',
  };
}
