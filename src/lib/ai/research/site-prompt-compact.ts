import type { ResearchBrief } from './types';

/** Allowed semantic block types — keep as one compact line for prompts. */
export const SITE_BLOCK_TYPES =
  'navbar,hero,heroSplit,heroCentered,services,features,featureGrid,about,stats,cta,testimonials,team,pricing,portfolio,faq,blog,contact,footer,gallery,process,trustedBy,newsletter,dashboardPreview';

/**
 * Compact multi-page site prompt (token-optimized).
 * Intentionally replaces the old mega AI_WEBSITE_BUILDER_PROMPT + override stack.
 */
export const buildCompactSiteSystemPrompt = ({
  prompt,
  hasImage,
  researchText,
}: {
  prompt: string;
  hasImage: boolean;
  researchText: string;
}): string => `CMS multi-page site builder. Return ONLY JSON (no markdown).

Allowed block types: ${SITE_BLOCK_TYPES}
Custom blocks: type "custom" + customType only if needed.

Output shape:
{"site":{"brand":"","title":"","description":"","theme":{"primaryColor":"#hex","secondaryColor":"#hex","backgroundColor":"#hex","textColor":"#hex","fontFamily":"stack","buttonStyle":"filled","borderRadius":"10px"},"header":{"blocks":[{"id":"nav","type":"navbar","order":1,"content":{"logo":"","links":[{"label":"","href":"/slug"}],"cta":{"label":"","href":"/contact"}}}]},"footer":{"blocks":[{"id":"ft","type":"footer","order":1,"content":{"brand":"","copyright":"","columns":[{"title":"","links":[{"label":"","href":"/slug"}]}]}}]},"pages":[{"slug":"home","title":"Home","pageName":"Home","isHome":true,"blocks":[{"id":"","type":"","order":1,"content":{},"images":{},"styles":{}}]}]}}

Rules:
- 4 pages default (home,about,services,contact) unless user/research says otherwise. Max 5 pages.
- One shared theme+header+footer. Nav hrefs must match page slugs (/about). home isHome:true.
- Home ≥5 body blocks; other pages ≥3. Distinct section mix per page. No navbar/footer inside page.blocks.
- Realistic niche copy only (no lorem/placeholders). Short headlines.
- Prefer researched theme colors when provided.
${researchText}
${hasImage ? 'Image attached: match its colors/layout for home; keep other pages consistent.\n' : ''}
USER: ${prompt || 'Build a complete multi-page business website.'}`;

/** Compact research injection for site prompts. */
export const formatResearchBriefCompact = (brief: ResearchBrief): string => {
  const pages = brief.recommendedPages
    .slice(0, 5)
    .map((p) => p.slug)
    .join(',');
  const hosts = brief.references
    .slice(0, 6)
    .map((r) => r.hostname)
    .join(',');
  const p = brief.palette;
  return `RESEARCH (${brief.source}|${brief.playbookId}): pages=[${pages}] homeSections=[${brief.homeSectionOrder.slice(0, 8).join('>')}] theme={${p.primaryColor},${p.secondaryColor},${p.backgroundColor},${p.textColor}|${p.fontFamily || 'Inter,system-ui,sans-serif'}} refs=[${hosts || 'none'}]
Use researched pages+theme. Original copy only.`;
};

/** Compact review prompt — compact JSON, short checklist. */
export const buildCompactSiteReviewPrompt = ({
  prompt,
  siteJsonCompact,
  researchText,
}: {
  prompt: string;
  siteJsonCompact: string;
  researchText: string;
}): string => `Repair site JSON if needed. Return ONLY {"qualityScore":0-100,"qualityNotes":["…"],"site":{…}}.

Checks: 1 navbar in header, 1 footer, ≥2 pages, one home slug, unique kebab slugs, nav↔pages, theme hex ok, no lorem, home≥5 body blocks.
Prefer researched theme/pages. qualityScore<80 only if unrecoverable.

USER: ${prompt || 'website'}
${researchText}
SITE:${siteJsonCompact}`;

export type SiteStructureAssessment = {
  ok: boolean;
  score: number;
  notes: string[];
};

/** Cheap local gate so we can skip a full LLM review when structure is already good. */
export const assessSiteStructureLocally = (data: unknown): SiteStructureAssessment => {
  const notes: string[] = [];
  let score = 100;
  const root =
    data && typeof data === 'object' && data !== null
      ? ((data as { site?: unknown }).site ?? data)
      : null;
  if (!root || typeof root !== 'object') {
    return { ok: false, score: 20, notes: ['missing site object'] };
  }
  const site = root as Record<string, unknown>;
  const pages = Array.isArray(site.pages) ? site.pages : [];
  if (pages.length < 2) {
    score -= 40;
    notes.push('too few pages');
  }
  const homes = pages.filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      (Boolean((p as { isHome?: boolean }).isHome) ||
        String((p as { slug?: string }).slug || '').toLowerCase() === 'home')
  );
  if (homes.length !== 1) {
    score -= 20;
    notes.push('home page count != 1');
  }
  const header = site.header as { blocks?: unknown[] } | undefined;
  const footer = site.footer as { blocks?: unknown[] } | undefined;
  if (!Array.isArray(header?.blocks) || header.blocks.length < 1) {
    score -= 15;
    notes.push('missing header');
  }
  if (!Array.isArray(footer?.blocks) || footer.blocks.length < 1) {
    score -= 15;
    notes.push('missing footer');
  }
  const emptyPages = pages.filter(
    (p) =>
      !p ||
      typeof p !== 'object' ||
      !Array.isArray((p as { blocks?: unknown[] }).blocks) ||
      (p as { blocks: unknown[] }).blocks.length === 0
  ).length;
  if (emptyPages > 0) {
    score -= Math.min(30, emptyPages * 10);
    notes.push(`${emptyPages} empty page(s)`);
  }
  return { ok: score >= 80, score: Math.max(0, score), notes };
};
