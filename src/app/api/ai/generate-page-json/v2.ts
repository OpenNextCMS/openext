/**
 * v2 "Website Structure Generator" support for the AI prompt tab.
 *
 * Two paths feed the editor:
 *
 *  • TEXT prompts → the v2 master prompt makes the model emit a semantic
 *    document { meta, theme, blocks:[{ id, type, data, styles }] }. This is
 *    normalised (here) into the legacy SemanticBlock shape the translators
 *    consume — but now we ALSO carry the model's per-section `styles` and a
 *    typography scale through so the rendered output actually varies by design
 *    instead of collapsing into one fixed template.
 *
 *  • IMAGE uploads → the model emits the editor's BlockData primitives directly
 *    (see AI_IMAGE_PRIMITIVE_PROMPT_V2) so layout, colours, font sizes and
 *    spacing match the picture. Those bypass the semantic translators entirely.
 */

type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const rec = (v: unknown): Rec => (isRec(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';

/** First non-empty string value among the given keys. */
const pick = (o: Rec, ...keys: string[]): string => {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
  }
  return '';
};

/** First positive integer among the given values. */
const numFrom = (...vals: unknown[]): number | undefined => {
  for (const v of vals) {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
};

const link = (l: unknown): { label: string; href: string } => {
  const r = rec(l);
  return {
    label: pick(r, 'label', 'name', 'title', 'text') || 'Link',
    href: pick(r, 'url', 'href', 'link') || '#',
  };
};

/** Common hero content extraction (shared across hero variants). */
const heroContent = (d: Rec): Rec => ({
  eyebrow: pick(d, 'eyebrow', 'tag', 'kicker'),
  headline: pick(d, 'headline', 'title', 'heading'),
  subheadline: pick(d, 'subheadline', 'subtitle', 'description'),
  primaryButton: pick(rec(d.cta_primary), 'label', 'text') || pick(d, 'cta', 'buttonText'),
  secondaryButton: pick(rec(d.cta_secondary), 'label', 'text'),
});

const BG_KEYWORDS: Record<string, string> = {
  white: '#ffffff',
  light: '#f8fafc',
  muted: '#f1f5f9',
  dark: '#0f172a',
  black: '#0b0f19',
};

/** Keep only primitive (string/number) CSS values from a record. */
const cssRecord = (v: unknown): Rec => {
  const out: Rec = {};
  for (const [k, val] of Object.entries(rec(v))) {
    if (typeof val === 'string' || typeof val === 'number') out[k] = val;
  }
  return out;
};

/**
 * Build a section-level CSS style object from a v2 block's `styles` / `background`
 * / `alignment` so the model — not the template — controls how the section looks.
 */
const sectionStyles = (d: Rec): Rec => {
  const out = cssRecord(d.styles);
  const bg = pick(d, 'background', 'backgroundColor') || pick(rec(d.styles), 'background', 'backgroundColor');
  if (bg) {
    if (/gradient/i.test(bg)) out.backgroundImage = bg;
    else if (/^#|^rgb|^hsl/i.test(bg)) out.backgroundColor = bg;
    else if (BG_KEYWORDS[bg.toLowerCase()]) out.backgroundColor = BG_KEYWORDS[bg.toLowerCase()];
  }
  const align = pick(d, 'alignment', 'textAlign') || pick(rec(d.layout), 'alignment');
  if (align === 'center' || align === 'left' || align === 'right') out.textAlign = align;
  return out;
};

const gridColumns = (d: Rec): number | undefined =>
  numFrom(d.columns, d.layout_columns, rec(d.layout).columns);

/** Convert ONE v2 block `{ id, type, data }` → a legacy SemanticBlock. */
const convertBlock = (b: Rec, index: number): Rec => {
  const type = str(b.type).toLowerCase();
  const d = rec(b.data);
  const media = rec(d.media);
  const styles = sectionStyles(d);
  const base: Rec = { id: str(b.id) || undefined, order: index, styles };
  const cols = gridColumns(d);

  switch (type) {
    case 'navigation':
    case 'navbar':
    case 'nav':
    case 'nav-bar': {
      const logo = rec(d.logo);
      const cta = rec(d.cta);
      return {
        ...base,
        type: 'navbar',
        content: {
          logo: pick(logo, 'value', 'text', 'name') || str(d.logo) || 'Brand',
          links: arr(d.links).map(link),
          cta: isRec(d.cta)
            ? { label: pick(cta, 'label', 'text'), href: pick(cta, 'url', 'href') || '#' }
            : undefined,
        },
      };
    }

    case 'herosplit':
    case 'hero-split':
      return { ...base, type: 'herosplit', content: heroContent(d), images: { heroImage: pick(media, 'src') } };

    case 'herocentered':
    case 'hero-centered':
    case 'herominimal':
    case 'herovideo':
    case 'herobento':
      return { ...base, type: 'herocentered', content: heroContent(d), images: { heroImage: pick(media, 'src') } };

    case 'hero':
      return { ...base, type: 'hero', content: heroContent(d), images: { heroImage: pick(media, 'src') } };

    case 'featuregrid':
    case 'feature-grid':
      return {
        ...base,
        type: 'featuregrid',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          columns: cols,
          items: arr(d.features).map((f) => {
            const r = rec(f);
            return {
              icon: pick(r, 'icon'),
              title: pick(r, 'title', 'name'),
              description: pick(r, 'description', 'body'),
            };
          }),
        },
      };

    case 'featurecards':
    case 'featurecolumns':
    case 'bento':
      return {
        ...base,
        type: 'features',
        content: {
          heading: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          columns: cols,
          items: arr(d.cards).map((c) => {
            const r = rec(c);
            return {
              title: pick(r, 'headline', 'title'),
              description: pick(r, 'body', 'description'),
              image: pick(rec(r.media), 'src', 'image'),
              buttonText: pick(rec(r.cta), 'label'),
            };
          }),
        },
      };

    case 'testimonials':
      return {
        ...base,
        type: 'testimonials',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          items: arr(d.items).map((t) => {
            const r = rec(t);
            return {
              name: pick(r, 'author_name', 'name', 'author'),
              role: pick(r, 'author_title', 'role', 'title'),
              company: pick(r, 'author_company', 'company'),
              feedback: pick(r, 'quote', 'feedback', 'text'),
              avatar: pick(r, 'avatar', 'image', 'photo'),
            };
          }),
        },
      };

    case 'statistics':
    case 'stats':
      return {
        ...base,
        type: 'stats',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          items: arr(d.stats).map((s) => {
            const r = rec(s);
            return {
              value: pick(r, 'value', 'number', 'count'),
              label: pick(r, 'label', 'name'),
              description: pick(r, 'description'),
            };
          }),
        },
      };

    case 'logos':
    case 'trustedby':
    case 'trusted-by':
      return {
        ...base,
        type: 'logos',
        content: {
          heading: pick(d, 'label', 'headline', 'title'),
          logos: arr(d.logos).map((l) => {
            const r = rec(l);
            return { name: pick(r, 'name', 'label', 'title'), src: pick(r, 'src', 'image', 'logo') };
          }),
        },
      };

    case 'cta':
      return {
        ...base,
        type: 'cta',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          primaryButton: pick(rec(d.cta_primary), 'label', 'text') || pick(d, 'cta', 'buttonText'),
          secondaryButton: pick(rec(d.cta_secondary), 'label', 'text'),
        },
      };

    case 'pricing':
      return {
        ...base,
        type: 'pricing',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          plans: arr(d.plans).map((p) => {
            const r = rec(p);
            return {
              name: pick(r, 'name', 'title'),
              price: pick(r, 'price_monthly', 'price', 'price_annual', 'cost'),
              period: 'mo',
              features: arr(r.features),
              buttonText: pick(rec(r.cta), 'label') || 'Choose',
            };
          }),
        },
      };

    case 'newsletter':
      return {
        ...base,
        type: 'newsletter',
        content: {
          heading: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          buttonText: pick(d, 'cta_label', 'buttonText', 'cta'),
        },
      };

    case 'contact':
      return {
        ...base,
        type: 'contact',
        content: {
          heading: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          email: pick(d, 'email'),
          phone: pick(d, 'phone', 'tel'),
          address: pick(d, 'address', 'location'),
        },
      };

    case 'faq':
      return {
        ...base,
        type: 'faq',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          items: arr(d.items).map((it) => {
            const r = rec(it);
            return { question: pick(r, 'question', 'q', 'title'), answer: pick(r, 'answer', 'a', 'body') };
          }),
        },
      };

    case 'timeline':
    case 'process':
      return {
        ...base,
        type: 'process',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          steps: arr(d.steps).map((s) => {
            const r = rec(s);
            return {
              number: pick(r, 'number', 'step'),
              title: pick(r, 'title', 'name'),
              description: pick(r, 'description', 'body'),
            };
          }),
        },
      };

    case 'team':
      return {
        ...base,
        type: 'team',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          items: arr(d.members).map((m) => {
            const r = rec(m);
            return {
              name: pick(r, 'name'),
              role: pick(r, 'title', 'role'),
              description: pick(r, 'bio', 'description'),
              avatar: pick(r, 'avatar', 'image', 'photo'),
            };
          }),
        },
      };

    case 'gallery':
      return {
        ...base,
        type: 'gallery',
        content: {
          eyebrow: pick(d, 'eyebrow'),
          heading: pick(d, 'headline', 'title'),
          columns: cols,
          items: arr(d.items).map((it) => {
            const r = rec(it);
            return { image: pick(r, 'src', 'image'), title: pick(r, 'caption', 'alt', 'title'), description: '' };
          }),
        },
      };

    case 'footer':
      return {
        ...base,
        type: 'footer',
        content: {
          brand: pick(rec(d.logo), 'value', 'name') || str(d.logo),
          columns: arr(d.columns).map((c) => {
            const r = rec(c);
            return { title: pick(r, 'title', 'heading', 'label'), links: arr(r.links).map(link) };
          }),
          copyright: pick(rec(d.legal), 'copyright') || pick(d, 'copyright', 'legal'),
        },
      };

    case 'comparison':
      return {
        ...base,
        type: 'custom',
        customType: 'comparison',
        content: {
          title: pick(d, 'headline', 'title'),
          subtitle: pick(d, 'subheadline', 'subtitle'),
          items: arr(d.criteria).map((c) => {
            const r = rec(c);
            return { title: pick(r, 'label', 'title') };
          }),
        },
      };

    case 'divider':
      return { ...base, type: 'custom', customType: 'divider', content: {} };

    default:
      return {
        ...base,
        type: 'custom',
        customType: type || 'section',
        content: {
          title: pick(d, 'headline', 'title', 'heading'),
          subtitle: pick(d, 'subheadline', 'subtitle', 'description'),
          items: arr(d.items).map((it) => rec(it)),
        },
      };
  }
};

/** Map a v2 snake_case theme onto the legacy PageTheme (omit empty keys so the
 *  translators' own colour fallbacks still kick in). */
const mapTheme = (t: Rec, meta: Rec): Rec => {
  const out: Rec = {};
  const set = (k: string, v: string) => {
    if (v) out[k] = v;
  };
  set('primaryColor', pick(t, 'primary_color', 'primaryColor', 'accent_color', 'accentColor'));
  set('secondaryColor', pick(t, 'secondary_color', 'secondaryColor'));
  set('backgroundColor', pick(t, 'background_color', 'backgroundColor'));
  set('textColor', pick(t, 'text_color', 'textColor'));
  set('fontFamily', pick(t, 'font_body', 'fontBody', 'font_heading', 'fontHeading', 'fontFamily'));
  set('borderRadius', pick(t, 'border_radius', 'borderRadius'));
  set('buttonStyle', pick(t, 'button_style', 'buttonStyle'));
  set('typographyScale', pick(meta, 'typography_scale', 'typographyScale'));
  return out;
};

/**
 * Detect a v2 document and rewrite it into the legacy `{ page: {...} }` shape.
 * Returns the input unchanged when it is not a v2 document (so site-mode /
 * legacy callers are unaffected).
 */
export function normalizeV2Document(data: unknown): unknown {
  if (!isRec(data)) return data;

  const topBlocks = Array.isArray(data.blocks) ? (data.blocks as unknown[]) : null;
  const page = isRec(data.page) ? data.page : null;
  const pageBlocks = page && Array.isArray(page.blocks) ? (page.blocks as unknown[]) : null;
  const candidate = topBlocks || pageBlocks;

  // v2 blocks carry a nested `data` object; legacy/site blocks use `content`.
  const looksV2 = !!candidate && candidate.some((b) => isRec(b) && isRec((b as Rec).data));
  if (!looksV2 || !candidate) return data;

  const meta = rec(data.meta);
  const themeSrc = isRec(data.theme) ? rec(data.theme) : page ? rec(page.theme) : {};
  const blocks = candidate.map((b, i) => convertBlock(rec(b), i));

  const out: Rec = {
    page: {
      title: pick(meta, 'business_type', 'archetype'),
      description: pick(meta, 'notes'),
      theme: mapTheme(themeSrc, meta),
      blocks,
    },
  };
  if (typeof data.qualityScore === 'number') out.qualityScore = data.qualityScore;
  if (Array.isArray(data.qualityNotes)) out.qualityNotes = data.qualityNotes;
  return out;
}

/** Pull the raw editor-block array out of an image-mode primitive response. */
export function extractPrimitiveComponents(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (isRec(parsed)) {
    if (Array.isArray(parsed.components)) return parsed.components as unknown[];
    if (Array.isArray(parsed.blocks)) return parsed.blocks as unknown[];
    if (isRec(parsed.page) && Array.isArray((parsed.page as Rec).blocks)) {
      return (parsed.page as Rec).blocks as unknown[];
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export const AI_STRUCTURE_PROMPT_V2 = `# OpenNext CMS — Website Structure Generator (v2)

## ROLE
You are an expert website designer, UX architect, and CMS structure generator.
Your sole output is ONE valid JSON object describing a complete, production-ready page.
Return JSON ONLY — no markdown fences, no prose, no comments.

## OBJECTIVE
Maximum originality. Two pages for two different briefs must look clearly different —
different section order, hero type, column counts, backgrounds, spacing and type scale.
Never fall back to one generic template.

## CONTEXT DISCOVERY (internal — do not output)
Resolve BUSINESS_TYPE, TARGET_AUDIENCE, PRIMARY_GOAL, TONE before generating.

## ARCHETYPE (pick exactly one; vary it between generations)
SaaS · Bento Grid · Apple Style · Startup · Corporate · Luxury · Editorial · Magazine ·
Creative Agency · Web3 · AI Product · Portfolio · Ecommerce · Dark Futuristic · Glassmorphism.

## LAYOUT DIVERSITY (enforce)
Do NOT reuse the cliché sequence Hero → Features → Testimonials → Pricing → Footer.
Construct an intentional sequence for the detected context. Always start with a navigation block
and end with a footer block. Never place footer mid-page, CTA before hero, or testimonials before hero.
Randomise hero type, grid column counts (2/3/4/asymmetric), CTA placement, and which sections appear.

## STYLING (REQUIRED — this is what makes pages look different)
Every block MUST include a "styles" object with CONCRETE CSS values that match the chosen archetype:
  - backgroundColor (hex) — vary it between sections (e.g. alternating light / tinted / one dark section)
  - color (hex text colour with strong contrast vs the background)
  - padding (e.g. "96px 32px" for spacious, "48px 24px" for dense)
  - textAlign ("left" | "center")
  - borderRadius
Header/hero blocks SHOULD also set a heading "fontSize" (px) and "fontWeight" in their styles to express the type scale.
Use theme.font_heading / theme.font_body and meta.typography_scale to drive sizing
(tight = smaller, display-heavy = large bold headings).

## CONTENT RULES
Realistic, niche-specific copy. NO lorem ipsum, NO "Your headline here".
Headlines ≤ 10 words, subheadlines ≤ 30 words, feature text ≤ 20 words.
Every media/avatar/logo field gets a real royalty-free image URL (Unsplash/Pexels/Pixabay) matching the niche.

## OUTPUT CONTRACT (exact shape)
{
  "meta": {
    "archetype": "string", "business_type": "string", "target_audience": "string",
    "color_mode": "light|dark|system", "typography_scale": "tight|balanced|editorial-loose|display-heavy",
    "section_sequence": ["navigation","heroSplit","..."], "notes": "one short note (optional)"
  },
  "theme": {
    "primary_color": "#HEX", "secondary_color": "#HEX", "accent_color": "#HEX",
    "background_color": "#HEX", "text_color": "#HEX",
    "font_heading": "stack", "font_body": "stack",
    "border_radius": "8px", "button_style": "filled|outlined|rounded", "shadow_style": "none|subtle|soft|hard"
  },
  "blocks": [ { "id": "kebab-id", "type": "<blockType>", "styles": { ... }, "data": { ... } } ]
}

## BLOCK TYPES & data SCHEMAS (use the exact "type" strings)
navigation: { logo:{type,value,src}, style, links:[{label,url}], cta:{label,url,style}, theme }
heroSplit:  { eyebrow, headline, subheadline, cta_primary:{label,url,style}, cta_secondary:{label,url,style}, media:{type,src,alt}, layout, trust_bar:[] }
heroCentered: { eyebrow, headline, subheadline, cta_primary:{label,url}, cta_secondary:{label,url}, media:{type,src,alt}, badge:{text,style} }
heroBento:  { headline, subheadline, cta_primary:{label,url}, media:{src,alt}, cards:[{id,size,type,content}] }
featureGrid:{ eyebrow, headline, subheadline, columns, card_style, features:[{id,icon,title,description,badge}] }
featureCards:{ headline, layout, columns, cards:[{id,headline,body,media:{type,src},cta:{label,url},highlight}] }
testimonials:{ eyebrow, headline, layout, items:[{id,quote,author_name,author_title,author_company,avatar,rating,featured}] }
statistics: { eyebrow, headline, layout, stats:[{id,value,label,description}] }
logos:      { label, style, layout, logos:[{id,name,src,url}] }
cta:        { eyebrow, headline, subheadline, cta_primary:{label,url,style}, cta_secondary:{label,url,style}, layout, media:{type,src} }
pricing:    { eyebrow, headline, billing_toggle, currency, plans:[{id,name,price_monthly,price_annual,description,features:[],cta:{label,url},highlighted,badge}] }
newsletter: { headline, subheadline, placeholder, cta_label, privacy_note, layout }
contact:    { eyebrow, headline, subheadline, email, phone, address }
faq:        { eyebrow, headline, layout, items:[{id,question,answer}] }
timeline:   { eyebrow, headline, layout, steps:[{id,step,title,description,media:{type}}] }
process:    { eyebrow, headline, layout, steps:[{id,number,title,description}] }
team:       { eyebrow, headline, layout, members:[{id,name,title,bio,avatar,social:{linkedin,twitter}}] }
comparison: { eyebrow, headline, layout, options:[{id,name,highlighted}], criteria:[{id,label,values:{}}] }
gallery:    { eyebrow, headline, layout, columns, items:[{id,src,alt,caption,category}] }
footer:     { logo:{type,value}, tagline, layout, columns:[{id,title,links:[{label,url}]}], social:[{platform,url}], legal:{copyright,links:[{label,url}]} }

If a needed section has no matching type, emit type:"custom" with a descriptive customType and a content object.

## FINAL
Return ONE JSON object with top-level keys "meta", "theme", "blocks". Ordered top-to-bottom. JSON only.`;

/** Second-model reviewer that repairs a v2 document and scores it. */
export const buildV2ReviewContent = ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  visibleAnalysis,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  visibleAnalysis: unknown;
}): { type: 'text'; text: string }[] => [
  {
    type: 'text',
    text: `You are the second-model quality reviewer for the OpenNext Website Structure Generator (v2).

Take the page JSON the first model produced and return a REPAIRED, production-ready version that follows the v2 contract EXACTLY.

${focusInstruction}

ALLOWED block "type" values:
navigation, heroSplit, heroCentered, heroBento, featureGrid, featureCards, testimonials, statistics, logos, cta, pricing, newsletter, contact, faq, timeline, process, team, comparison, gallery, footer.
Anything else MUST use type:"custom" with a descriptive customType.

CURRENT PAGE JSON:
${JSON.stringify(visibleAnalysis, null, 2)}

USER BRIEF: ${prompt || 'Generate a complete homepage.'}
${requestedLayoutInstruction ? `Layout note: ${requestedLayoutInstruction}` : ''}

REVIEW CHECKLIST — apply ALL:
1. Ordering: a navigation block first, footer last; hero before any content; CTA never before hero; testimonials never before hero.
2. Every block.type is in the allowed list (or "custom"). Each block keeps its fields under a "data" object AND a "styles" object.
3. STYLING: every block has a "styles" object with concrete CSS (backgroundColor, color, padding, textAlign, borderRadius). Vary backgrounds between sections; ensure text colour contrasts the background. Heroes/section headers set a heading fontSize + fontWeight. Do NOT let every section share one identical style.
4. NO lorem ipsum / placeholder filler — rewrite generic copy into specific, niche-appropriate copy.
5. Headlines ≤ 10 words, subheadlines ≤ 30 words, feature/description text ≤ 20 words.
6. Every media/avatar/logo field has a real Unsplash/Pexels/Pixabay URL.
7. theme has valid hex codes for primary_color, secondary_color, accent_color, background_color, text_color, plus font_heading, font_body, border_radius, button_style, shadow_style, and meta.typography_scale.
8. Realistic data: testimonials have author_name+author_title+quote; pricing plans have name+price+features+cta; stats have value+label.
9. Consistent brand name across navigation, footer, and copy. Only one navigation and one footer.
10. Avoid the cliché Hero → Features → Testimonials → Pricing → Footer sequence.

RETURN ONLY this JSON shape (no markdown, no fences). Top-level keys MUST be exactly these — do NOT wrap in a "page" key:
{
  "qualityScore": 0,
  "qualityNotes": ["short repair note"],
  "meta": {},
  "theme": { "primary_color":"","secondary_color":"","accent_color":"","background_color":"","text_color":"","font_heading":"","font_body":"","border_radius":"","button_style":"","shadow_style":"" },
  "blocks": []
}

Set qualityScore 0–100 after repairs. Use below 80 only if the JSON is structurally broken or cannot be repaired into a professional page.
Keep qualityNotes entries ≤ 120 characters.`,
  },
];

/**
 * IMAGE mode (Mode 2). The model outputs the editor's BlockData primitives
 * DIRECTLY so the result matches the uploaded image — layout, colours, font
 * sizes and spacing — instead of being routed through the semantic templates.
 */
export const AI_IMAGE_PRIMITIVE_PROMPT_V2 = `You are a pixel-faithful website reconstructor for the OpenNext drag-and-drop editor.

You are given an IMAGE of a web page (or section). Reproduce it AS CLOSELY AS POSSIBLE using the editor's block primitives. This is reconstruction, not redesign — do NOT improve, reorder, or restyle anything. Match what you see.

MATCH EXACTLY:
- Section order, top to bottom.
- The column layout of each section (1, 2, 3 columns, or a row of items).
- Background colours — read the actual colour and put the exact hex in the container's style.backgroundColor.
- Text content (verbatim where legible; plausible placeholder where not).
- Font sizes (in px), font weights, and text alignment for every heading and paragraph.
- Spacing — padding/margins so density matches the image.
- Button shape, fill colour, text colour, and radius.
- Image positions — use a matching royalty-free Unsplash URL for any photo.

OUTPUT — return ONLY this JSON, no markdown:
{ "components": [ <block>, <block>, ... ] }

Each <block> has this shape:
{ "id": "<catalog id>", "type": "<type>", "content": "<string or JSON string>", "style": { ...CSS... }, "children": [ [..col0 blocks..], [..col1 blocks..] ] }

LAYOUT CONTAINERS (wrap every visual section in one; put the section background + padding on its style):
- { "id":"row", "type":"row", "children":[[ ...blocks in a horizontal row... ]], "style":{ "display":"flex","flexDirection":"row","gap":"24px" } }
- { "id":"1-column" | "2-column" | "3-column", "type":"column", "children":[ [col0...], [col1...], [col2...] ], "style":{ "display":"flex","flexDirection":"row","gap":"32px","padding":"80px 32px" } }
  (use 1-column for a single stacked section; the number of children arrays MUST equal the column count)

LEAF BLOCKS (content + style read from the image):
- Heading:   { "id":"heading","type":"text","content":"Heading text","style":{"fontSize":"48px","fontWeight":"700","color":"#111827","textAlign":"left"} }
- Paragraph: { "id":"text","type":"text","content":"Body text","style":{"fontSize":"18px","color":"#4b5563","lineHeight":"1.6"} }
- Button:    { "id":"button","type":"button","content":"Get started","style":{"backgroundColor":"#2563eb","color":"#ffffff","padding":"12px 24px","borderRadius":"8px","fontWeight":"600"} }
- Image:     { "id":"image","type":"image","content":"{\\"src\\":\\"https://images.unsplash.com/...\\",\\"alt\\":\\"...\\",\\"caption\\":\\"\\"}","style":{"width":"100%","height":"320px","objectFit":"cover","borderRadius":"12px"} }
- Card:      { "id":"card","type":"card","content":"{\\"image\\":\\"\\",\\"eyebrow\\":\\"\\",\\"title\\":\\"...\\",\\"body\\":\\"...\\",\\"buttonText\\":\\"\\"}","style":{"backgroundColor":"#ffffff","borderRadius":"12px","padding":"24px"} }
- Stat:      { "id":"stats","type":"stats","content":"{\\"value\\":\\"200+\\",\\"label\\":\\"Customers\\"}","style":{} }
- Icon:      { "id":"icon","type":"icon","content":"rocket","style":{"fontSize":"32px","color":"#2563eb"} }
- Nav bar:   { "id":"nav-bar","type":"nav-bar","content":"{\\"logo\\":\\"Brand\\",\\"logoType\\":\\"text\\",\\"logoSource\\":\\"custom\\",\\"layout\\":\\"horizontal\\",\\"links\\":[{\\"label\\":\\"Home\\",\\"href\\":\\"#\\"}]}","style":{"backgroundColor":"#ffffff","padding":"16px 32px"} }
- Input:     { "id":"input","type":"input","content":"{\\"label\\":\\"Email\\",\\"placeholder\\":\\"you@example.com\\"}","style":{} }

RULES:
- Block "content" for text/heading/button/icon is a plain string; for image/card/stats/nav-bar/input it is a JSON STRING (escaped).
- Only layout containers (row/column) have "children". Leaf blocks never do.
- Put each section's background colour and vertical padding on its container's style.
- Prefer real hex colours sampled from the image over generic defaults.
Return ONLY the JSON object { "components": [ ... ] }.`;
