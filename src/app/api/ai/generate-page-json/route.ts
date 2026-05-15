import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jsonrepair } from 'jsonrepair';
import type { CSSProperties } from 'react';
import type { BlockData } from '@/types';
import {
  aiEditorBlocksById,
  aiEditorBlocksByType,
  aiEditorBlockTypes,
  type AiEditorBlock,
} from './block-catalog';
import {
  extractPalette,
  formatPaletteForPrompt,
  type ExtractedPalette,
} from './extract-palette';
import { enrichAnalysisWithImages, enrichComponentsWithImages } from './fetch-images';

export const runtime = 'nodejs';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || GROQ_VISION_MODEL;
// gemini-2.5-pro is significantly stronger at vision (column detection, font ID,
// spacing) than 2.5-flash and is free at AI Studio rate limits. Override via env
// if you hit free-tier RPM caps.
const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-pro';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BLOCKS = 120;
const MAX_DEPTH = 7;
const DEFAULT_IMAGE_RECREATE_PROMPT =
  'Recreate the uploaded image PIXEL-FOR-PIXEL as a webpage in the editor. Match EXACTLY: the layout, every section, every color (sample exact hex values), every gap and padding (measure in px), every font family (name it — Inter, Roboto, Poppins, Montserrat, Playfair Display, etc.), font size, font weight, line height, letter spacing, border radius, shadows, gradients, alignment, and all readable text using only editor blocks.';

// Constrained font shortlist. LLMs are unreliable at identifying real fonts
// from screenshots, so we force a pick from a small set of widely-loaded
// Google Fonts. Each entry includes the full CSS stack to drop straight in.
const FONT_SHORTLIST = [
  { name: 'Inter',              stack: 'Inter, system-ui, sans-serif',                  category: 'sans / modern UI' },
  { name: 'Poppins',            stack: 'Poppins, system-ui, sans-serif',                category: 'sans / geometric / friendly' },
  { name: 'Roboto',             stack: 'Roboto, system-ui, sans-serif',                 category: 'sans / neutral / Material' },
  { name: 'Montserrat',         stack: 'Montserrat, system-ui, sans-serif',             category: 'sans / display / bold marketing' },
  { name: 'DM Sans',            stack: '"DM Sans", system-ui, sans-serif',              category: 'sans / low-contrast / minimal' },
  { name: 'Plus Jakarta Sans',  stack: '"Plus Jakarta Sans", system-ui, sans-serif',    category: 'sans / SaaS / startup' },
  { name: 'Open Sans',          stack: '"Open Sans", system-ui, sans-serif',            category: 'sans / humanist / readable' },
  { name: 'Playfair Display',   stack: '"Playfair Display", Georgia, serif',            category: 'serif / display / elegant' },
  { name: 'Lora',               stack: 'Lora, Georgia, serif',                          category: 'serif / body / editorial' },
  { name: 'JetBrains Mono',     stack: '"JetBrains Mono", "Courier New", monospace',    category: 'mono / code' },
] as const;

const FONT_SHORTLIST_PROMPT = `FONT CONSTRAINT — pick exactly one fontFamily value from this list per text element, no others:
${FONT_SHORTLIST.map((f) => `  ${f.name.padEnd(22)} → fontFamily: "${f.stack}"  (${f.category})`).join('\n')}
Decision rule: sans-serif body text → Inter or DM Sans. Bold marketing headings → Poppins or Montserrat. Editorial/luxury → Playfair Display or Lora. Code/technical → JetBrains Mono. Do NOT output font names that are not on this list.`;

const VISUAL_FIDELITY_RULES = `VISUAL FIDELITY RULES — YOU MUST FOLLOW THESE TO PRODUCE AN EXACT MATCH:
- COLORS: Sample exact hex values from the image. Never round to common colors. If a button is #2D7FF9, output "#2D7FF9", not "#3B82F6". Capture text color, background color, border color, gradient stops separately. When an EXTRACTED COLOR PALETTE is provided below, you MUST use only those hex codes (or near-tones of them) — do not invent new colors.
- FONTS: ${FONT_SHORTLIST_PROMPT}
- SPACING: Measure padding and gap in pixels from the image. A hero section padding is typically 48px-96px vertical. Section gap between elements 12px-24px. Section gap between sections 32px-64px. Never guess "16px" for everything — measure.
- TYPOGRAPHY METRICS: Always include lineHeight (1.2 for headings, 1.5-1.6 for body), letterSpacing (-0.02em for big headings, 0 for body, 0.05em for caps), and textAlign.
- BORDERS & SHADOWS: Capture borderRadius (px), border (e.g. "1px solid #e5e7eb"), boxShadow (e.g. "0 4px 12px rgba(0,0,0,0.08)").
- GRADIENTS: When backgrounds use gradients, output backgroundImage with linear-gradient or radial-gradient instead of backgroundColor.
- IMAGES: For image blocks, output a placeholder src ("/placeholder-image.png") and a precise alt description of what the image shows so the user can swap it.
- ICONS: Match the exact lucide icon name. If you see a chat bubble, use "message-circle". A shopping bag, use "shopping-bag".`;

type PageContext = 'page' | 'header' | 'footer';

const HEADER_FOCUS_INSTRUCTION = `IMPORTANT CONTEXT — HEADER PAGE:
- You are editing a HEADER. Output ONLY the header/nav portion of the page.
- The output should be exactly ONE top-level "nav-bar" block, optionally inside a 1-column wrapper.
- Do NOT output hero sections, body content, or footer content. Only the visible top navigation.
- nav-bar content schema: {"logo":"Brand","logoType":"text","logoImage":"","layout":"horizontal","links":[{"label":"Home","href":"#","onClick":"none","onClickValue":""}, ...]}
- Set layout to "horizontal" (logo left, links right), "vertical" (stacked sidebar), "hamburger" (mobile-style), or "two-line" (logo top, links below) based on the image.`;

const FOOTER_FOCUS_INSTRUCTION = `IMPORTANT CONTEXT — FOOTER PAGE:
- You are editing a FOOTER. Output ONLY the footer portion of the page.
- Use multi-column layouts for link groups (2-column or 3-column with text blocks for links).
- Always end with a small text block for copyright.
- Do NOT output nav-bars, hero sections, or any body content. Only the visible bottom footer.
- Use dark backgroundColor (e.g. #0f172a, #111827) on the container only when the source footer is dark.`;

const PAGE_FOCUS_INSTRUCTION = `IMPORTANT CONTEXT — PAGE BODY:
- You are editing the BODY of a regular page (not the header or footer).
- Do NOT include a nav-bar in the output — the site already has a global header.
- Do NOT include a footer-style copyright section — the site already has a global footer.
- Focus on the visible main content (hero, features, cards, stats, sections) between the header and footer of the image.`;

const getFocusInstruction = (pageType: PageContext): string => {
  if (pageType === 'header') return HEADER_FOCUS_INSTRUCTION;
  if (pageType === 'footer') return FOOTER_FOCUS_INSTRUCTION;
  return PAGE_FOCUS_INSTRUCTION;
};

const allowedBlockTypes = aiEditorBlockTypes;

type GroqContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

type UnknownRecord = Record<string, unknown>;
type RequestedLayout = 'row' | '1-column' | '2-column' | '3-column' | null;

// ---------------------------------------------------------------------------
// Compact catalog — one line per block, avoids prompt bloat / token limit errors
// ---------------------------------------------------------------------------
const COMPACT_CATALOG = [
  { id: 'row',           type: 'row',           cols: 2, content: '""' },
  { id: '1-column',      type: 'column',        cols: 1, content: '""' },
  { id: '2-column',      type: 'column',        cols: 2, content: '""' },
  { id: '3-column',      type: 'column',        cols: 3, content: '""' },
  { id: 'nav-bar',       type: 'nav-bar',       cols: 0, content: '{"logo":"Brand","logoType":"text","logoImage":"","links":[{"label":"Home","href":"#","onClick":"none","onClickValue":""}]}' },
  { id: 'text',          type: 'text',          cols: 0, content: '"paragraph text"' },
  { id: 'heading',       type: 'text',          cols: 0, content: '"Heading"' },
  { id: 'button',        type: 'button',        cols: 0, content: '"Click Me"' },
  { id: 'icon',          type: 'icon',          cols: 0, content: '"sparkles"' },
  { id: 'image',         type: 'image',         cols: 0, content: '{"src":"","alt":"Image","caption":""}' },
  { id: 'card',          type: 'card',          cols: 0, content: '{"image":"","eyebrow":"","title":"Title","body":"Body text","buttonText":"Read More"}' },
  { id: 'stats',         type: 'stats',         cols: 0, content: '{"value":"100+","label":"Projects"}' },
  { id: 'progress',      type: 'progress',      cols: 0, content: '{"label":"Progress","percentage":80}' },
  { id: 'countdown',     type: 'countdown',     cols: 0, content: '{"days":"0","hours":"00","minutes":"00","seconds":"00"}' },
  { id: 'shape-divider', type: 'shape-divider', cols: 0, content: '{"shape":"wave","color":"#ffffff","height":120,"flip":false}' },
  { id: 'input',         type: 'input',         cols: 0, content: '{"label":"Label","placeholder":"","name":"field","inputType":"text","required":false,"labelStyle":{}}' },
  { id: 'textarea',      type: 'textarea',      cols: 0, content: '{"label":"Message","placeholder":"","name":"message","value":"","required":false,"labelStyle":{}}' },
  { id: 'radio',         type: 'radio',         cols: 0, content: '{"label":"Option","name":"group","value":"val","checked":false,"required":false,"labelStyle":{}}' },
  { id: 'checkbox',      type: 'checkbox',      cols: 0, content: '{"label":"I agree","name":"agreement","value":"yes","checked":false,"required":false,"labelStyle":{}}' },
  { id: 'switch',        type: 'switch',        cols: 0, content: '{"label":"Enable","name":"toggle","checked":false,"labelStyle":{}}' },
  { id: 'table',         type: 'table',         cols: 0, content: '{"caption":"","headers":["Col1","Col2"],"rows":[["A","B"]]}' },
  { id: 'tabs',          type: 'tabs',          cols: 0, content: '{"defaultValue":"tab1","tabs":[{"value":"tab1","label":"Tab 1","content":"Content here"}]}' },
  { id: 'avatar',        type: 'avatar',        cols: 0, content: '{"src":"","alt":"User","fallback":"U"}' },
  { id: 'separator',     type: 'separator',     cols: 0, content: '{"orientation":"horizontal"}' },
  { id: 'skeleton',      type: 'skeleton',      cols: 0, content: '{"label":""}' },
] as const;

const compactCatalogString = COMPACT_CATALOG
  .map(b => `${b.id} | type:${b.type} | cols:${b.cols} | content:${b.content}`)
  .join('\n');

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const baseSystemPrompt = `You output JSON for a webpage builder.
Return ONLY: {"components":[...]}
No markdown, no fences, no explanation, no extra keys.

BLOCK SCHEMA:
{
  "id": "<catalog id>",
  "label": "<human label>",
  "type": "<catalog type>",
  "content": "<string — plain text or JSON-stringified object>",
  "style": { "camelCaseCssProp": "value" },
  "children": [[col0blocks], [col1blocks]]
}

CATALOG (id | type | cols=child array count | content shape):
${compactCatalogString}

CRITICAL LAYOUT RULES:
1. components[] holds one block per visible page section, top-to-bottom.
2. Layout blocks (row, 1-column, 2-column, 3-column) have children: array of N arrays (N = cols value).
3. Leaf blocks (text, heading, button, icon, stats, progress, countdown, card, image, etc.) NEVER have children.
4. nav-bar is always first. Use 1-column for full-width, 2-column or 3-column for multi-col sections.
5. Leaf blocks go DIRECTLY into column arrays. Never wrap a leaf in another column block.
6. ALWAYS set flex layout on multi-column containers:
   - 2-column style: {"display":"flex","flexDirection":"row","gap":"24px","width":"100%","alignItems":"flex-start"}
   - 3-column style: {"display":"flex","flexDirection":"row","gap":"24px","width":"100%","alignItems":"flex-start"}
   - Each column child that holds leaf blocks needs: {"flex":"1","display":"flex","flexDirection":"column","gap":"12px"}
   Wait — columns ARE the arrays in children[], not blocks. Only the container block itself needs flex style.
7. heading id="heading" type="text" content="the heading string".
8. icon content = lucide icon name string e.g. "shield".
9. stats content = JSON string: {"value":"200+","label":"Project Delivered"}.
10. progress content = JSON string: {"label":"Delivery Rate","percentage":100}.
11. countdown content = JSON string: {"days":"0","hours":"00","minutes":"00","seconds":"00"}.
12. card/image/nav-bar/etc: content = JSON-stringified object matching catalog shape.
13. Style: camelCase CSS, hex colors, px units. Set backgroundColor on section containers.
14. VISUAL FIDELITY — every text-bearing block (heading, text, button, card, stats, etc.) MUST set:
    fontFamily (full CSS stack like "Inter, system-ui, sans-serif"),
    fontSize (px), fontWeight, lineHeight, letterSpacing, color (6-digit hex), textAlign.
15. Containers MUST set the EXACT padding and gap measured from the image — not defaults.
    Typical hero padding 64-128px vertical. Card padding 24-32px. Button padding 12-16px vertical / 24-32px horizontal.
16. Use backgroundImage with linear-gradient(...) when the source uses a gradient, instead of backgroundColor.
17. Sample exact hex colors. #111827 ≠ #000000. #2563EB ≠ #3B82F6. Use the value you actually see.
18. For images you cannot reproduce, set src to "/placeholder-image.png" and include a precise alt describing the image.

COLUMN DISTRIBUTION RULES (CRITICAL — READ CAREFULLY):
- A 2-column block MUST have children with EXACTLY 2 arrays: [ [col1items], [col2items] ]
- A 3-column block MUST have children with EXACTLY 3 arrays: [ [col1items], [col2items], [col3items] ]
- NEVER put all elements into children[0] and leave other column arrays empty.
- Each column array must contain the leaf blocks that visually belong in that column.
- If a section has 3 columns, distribute elements across all 3 arrays based on their visual column position.

MULTI-COLUMN EXAMPLE (3 columns, dark background):
{
  "id": "3-column", "label": "3 Column Layout", "type": "column", "content": "",
  "style": {"backgroundColor":"#1e2330","display":"flex","flexDirection":"row","gap":"32px","padding":"48px 32px","width":"100%","alignItems":"flex-start"},
  "children": [
    [
      {"id":"heading","type":"text","content":"Column 1 Title","style":{"color":"#ffffff","fontSize":"20px","fontWeight":"700"}},
      {"id":"text","type":"text","content":"Some paragraph","style":{"color":"#cccccc"}}
    ],
    [
      {"id":"stats","type":"stats","content":"{\"value\":\"200+\",\"label\":\"Projects\"}","style":{"color":"#ffffff"}},
      {"id":"progress","type":"progress","content":"{\"label\":\"Delivery Rate\",\"percentage\":100}","style":{}}
    ],
    [
      {"id":"countdown","type":"countdown","content":"{\"days\":\"0\",\"hours\":\"00\",\"minutes\":\"00\",\"seconds\":\"00\"}","style":{"color":"#ffffff"}}
    ]
  ]
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const safeString = (value: unknown, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const detectRequestedLayout = (prompt: string): RequestedLayout => {
  const normalized = prompt.toLowerCase().replace(/[_-]+/g, ' ');
  if (/\b(3|three)\s+columns?\b/.test(normalized)) return '3-column';
  if (/\b(2|two)\s+columns?\b/.test(normalized)) return '2-column';
  if (/\b(1|one)\s+columns?\b/.test(normalized)) return '1-column';
  if (/\brow\s+layout\b/.test(normalized)) return 'row';
  return null;
};

const getRequestedLayoutColumnCount = (layout: RequestedLayout) => {
  if (layout === '1-column') return 1;
  if (layout === '2-column') return 2;
  if (layout === '3-column') return 3;
  return 0;
};

const getRequestedLayoutLabel = (layout: RequestedLayout) => {
  if (layout === '1-column') return '1 Column Layout';
  if (layout === '2-column') return '2 Column Layout';
  if (layout === '3-column') return '3 Column Layout';
  return 'Row Layout';
};

const getRequestedLayoutDescription = (layout: RequestedLayout) => {
  if (layout === '1-column') return 'Single column layout';
  if (layout === '2-column') return 'Two equal width columns';
  if (layout === '3-column') return 'Three equal width columns';
  return 'Flex row layout for blocks';
};

const getRequestedLayoutInstruction = (layout: RequestedLayout) => {
  if (!layout || layout === 'row') return '';
  return `User requested ${getRequestedLayoutLabel(layout)}. Wrap primary content in: {"id":"${layout}","label":"${getRequestedLayoutLabel(layout)}","type":"column","children":${JSON.stringify(Array.from({ length: getRequestedLayoutColumnCount(layout) }, () => []))}}`;
};

const sanitizeStyle = (value: unknown): CSSProperties => {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<CSSProperties>((style, [key, rawValue]) => {
    if (
      typeof rawValue === 'string' ||
      typeof rawValue === 'number' ||
      typeof rawValue === 'boolean'
    ) {
      return { ...style, [key]: rawValue };
    }
    return style;
  }, {});
};

const sanitizeEvents = (value: unknown): BlockData['events'] | undefined => {
  if (!isRecord(value)) return undefined;
  return {
    onClick: safeString(value.onClick, 'none'),
    onClickValue: safeString(value.onClickValue),
  };
};

const getEditorBlockDefinition = (
  id: string,
  type: BlockData['type']
): AiEditorBlock | undefined => aiEditorBlocksById.get(id) || aiEditorBlocksByType[type];

const sanitizeBlock = (
  value: unknown,
  depth = 0,
  context: { count: number } = { count: 0 }
): BlockData | null => {
  if (!isRecord(value) || depth > MAX_DEPTH || context.count >= MAX_BLOCKS) return null;

  const id = safeString(value.id);
  const idDefinition = aiEditorBlocksById.get(id);
  const rawType = safeString(value.type, 'text') as BlockData['type'];
  const type = idDefinition?.type || (allowedBlockTypes.has(rawType) ? rawType : 'text');
  const definition = getEditorBlockDefinition(id, type);
  const style = sanitizeStyle(value.style);
  context.count += 1;

  const block: BlockData = {
    // Always mint a fresh UUID — model-emitted uniqueIds collide (duplicate React keys)
    uniqueId: crypto.randomUUID(),
    content: safeString(value.content) || definition?.content || '',
    type,
    style: definition && definition.type !== 'text' ? { ...definition.style, ...style } : style,
  };

  const label = safeString(value.label);
  const description = safeString(value.description);
  const icon = safeString(value.icon);
  const hoverStyle = sanitizeStyle(value.hoverStyle);
  const events = sanitizeEvents(value.events);

  if (definition?.id) block.id = definition.id;
  if (label || definition?.label) block.label = label || definition?.label;
  if (description || definition?.description) {
    block.description = description || definition?.description;
  }
  if (icon) block.icon = icon;
  if (Object.keys(hoverStyle).length > 0) block.hoverStyle = hoverStyle;
  if (events) block.events = events;

  // Only layout blocks get children — strip children from all leaf blocks
  const isLayoutBlock = type === 'row' || type === 'column';

  if (isLayoutBlock && Array.isArray(value.children)) {
    const children = value.children
      .filter(Array.isArray)
      .map((column) =>
        column
          .map((child) => sanitizeBlock(child, depth + 1, context))
          .filter((child): child is BlockData => Boolean(child))
      );

    if (children.length > 0) {
      block.children = children;
    }
  }

  return block;
};

// ---------------------------------------------------------------------------
// FIX 1: Post-processing — enforce correct column counts based on block id.
// This catches the most common AI mistake: placing all elements in children[0]
// and leaving the other column arrays empty, or returning wrong array count.
// ---------------------------------------------------------------------------
const enforceColumnCounts = (block: BlockData): BlockData => {
  if (!block.children) return block;

  const fixedChildren = block.children.map((col) =>
    col.map(enforceColumnCounts)
  );

  const expectedCols =
    block.id === '3-column' ? 3 :
    block.id === '2-column' ? 2 :
    block.id === '1-column' ? 1 :
    null;

  if (expectedCols && fixedChildren.length !== expectedCols) {
    // Redistribute all leaf blocks evenly across the expected column count
    const allBlocks = fixedChildren.flat();
    const redistributed = distributeBlocksIntoColumns(allBlocks, expectedCols);
    return {
      ...block,
      children: redistributed,
      style: {
        display: 'flex',
        flexDirection: expectedCols === 1 ? 'column' : 'row',
        gap: '32px',
        width: '100%',
        alignItems: 'flex-start',
        ...block.style,
      },
    };
  }

  // Also check if the column count is correct but all content is crammed into
  // one column while the others are empty — redistribute in that case too.
  if (
    expectedCols &&
    expectedCols > 1 &&
    fixedChildren.length === expectedCols
  ) {
    const nonEmptyCols = fixedChildren.filter((col) => col.length > 0);
    if (nonEmptyCols.length === 1 && fixedChildren[0].length > 1) {
      const allBlocks = fixedChildren.flat();
      const redistributed = distributeBlocksIntoColumns(allBlocks, expectedCols);
      return {
        ...block,
        children: redistributed,
        style: {
          display: 'flex',
          flexDirection: 'row',
          gap: '32px',
          width: '100%',
          alignItems: 'flex-start',
          ...block.style,
        },
      };
    }
  }

  return { ...block, children: fixedChildren };
};

// ---------------------------------------------------------------------------
// FIX 2: Collapse redundant single-child column wrappers — but ONLY when the
// inner block is a multi-column container. Previously this was too aggressive
// and would collapse legitimate 3-column sections that happened to be the
// only child of an outer wrapper.
// ---------------------------------------------------------------------------
const flattenSingleChildColumns = (block: BlockData): BlockData => {
  if (!block.children) return block;

  const flatChildren = block.children.map((column) =>
    column.map(flattenSingleChildColumns)
  );

  if (
    (block.type === 'column' || block.type === 'row') &&
    flatChildren.length === 1 &&
    flatChildren[0].length === 1 &&
    !block.style?.backgroundColor &&
    !block.style?.backgroundImage
  ) {
    const inner = flatChildren[0][0];
    // Only flatten if the inner block is itself a multi-column container
    // (i.e. it has more than one column array). This prevents accidentally
    // collapsing a 3-column section that sits alone inside a wrapper.
    if (
      (inner.type === 'column' || inner.type === 'row') &&
      inner.children &&
      inner.children.length > 1
    ) {
      return {
        ...block,
        children: inner.children,
        style: { ...inner.style, ...block.style },
      };
    }
  }

  return { ...block, children: flatChildren };
};

// ---------------------------------------------------------------------------
// FIX 3: Post-processing — fix multi-column containers missing flex display.
// ---------------------------------------------------------------------------
const ensureFlexOnMultiColumnContainers = (block: BlockData): BlockData => {
  if (!block.children) return block;

  const fixedChildren = block.children.map((col) =>
    col.map(ensureFlexOnMultiColumnContainers)
  );

  const isMultiCol =
    (block.type === 'column' || block.type === 'row') &&
    block.children.length > 1;

  if (isMultiCol) {
    return {
      ...block,
      children: fixedChildren,
      style: {
        gap: (block.style as Record<string, unknown>)?.gap as string || '24px',
        width: (block.style as Record<string, unknown>)?.width as string || '100%',
        alignItems: (block.style as Record<string, unknown>)?.alignItems as string || 'flex-start',
        ...block.style,
        // Force these regardless of what the AI set
        display: 'flex',
        flexDirection: 'row',
      },
    };
  }

  return { ...block, children: fixedChildren };
};

const ensureColumnChildren = (children: BlockData[][] | undefined, count: number) => {
  const nextChildren = children ? children.map((column) => [...column]) : [];
  while (nextChildren.length < count) nextChildren.push([]);
  if (nextChildren.length <= count) return nextChildren;
  const normalizedChildren = nextChildren.slice(0, count);
  normalizedChildren[count - 1] = [
    ...normalizedChildren[count - 1],
    ...nextChildren.slice(count).flat(),
  ];
  return normalizedChildren;
};

const applyEditorBlockDefaults = (block: BlockData): BlockData => {
  const children = block.children?.map((column) => column.map(applyEditorBlockDefaults));
  const definition = getEditorBlockDefinition(block.id || '', block.type);

  if (!definition) {
    return children ? { ...block, children } : block;
  }

  const nextBlock: BlockData = {
    ...block,
    id: definition.id,
    label: block.label || definition.label,
    description: block.description || definition.description,
    content: block.content || definition.content,
    style:
      definition.type === 'text'
        ? block.style
        : { ...definition.style, ...block.style },
    children,
  };

  if (definition.childrenColumns) {
    nextBlock.children = ensureColumnChildren(nextBlock.children, definition.childrenColumns);
  }

  return nextBlock;
};

const convertToRequestedColumnLayout = (block: BlockData, layout: RequestedLayout): BlockData => {
  const columnCount = getRequestedLayoutColumnCount(layout);
  if (!columnCount) return block;
  return {
    ...block,
    id: layout || undefined,
    label: getRequestedLayoutLabel(layout),
    description: getRequestedLayoutDescription(layout),
    type: 'column',
    children: ensureColumnChildren(block.children, columnCount),
    style: {
      ...block.style,
      display: 'flex',
      flexDirection: columnCount === 1 ? 'column' : 'row',
    },
  };
};

const distributeBlocksIntoColumns = (blocks: BlockData[], count: number) => {
  const columns = Array.from({ length: count }, () => [] as BlockData[]);
  blocks.forEach((block, index) => {
    columns[Math.min(index, count - 1)].push(block);
  });
  return columns;
};

const applyRequestedLayout = (components: BlockData[], layout: RequestedLayout): BlockData[] => {
  const columnCount = getRequestedLayoutColumnCount(layout);
  if (!columnCount) return components;

  let convertedMatchingRow = false;

  const convertMatchingRows = (block: BlockData): BlockData => {
    const children = block.children?.map((column) => column.map(convertMatchingRows));
    const nextBlock = children ? { ...block, children } : { ...block };
    if (nextBlock.type === 'row' && nextBlock.children?.length === columnCount) {
      convertedMatchingRow = true;
      return convertToRequestedColumnLayout(nextBlock, layout);
    }
    return nextBlock;
  };

  const convertedComponents = components.map(convertMatchingRows);

  if (convertedComponents.length === 1 && convertedComponents[0].type === 'row') {
    return [convertToRequestedColumnLayout(convertedComponents[0], layout)];
  }

  if (convertedMatchingRow) return convertedComponents;

  return [
    {
      uniqueId: crypto.randomUUID(),
      id: layout || undefined,
      label: getRequestedLayoutLabel(layout),
      description: getRequestedLayoutDescription(layout),
      content: '',
      type: 'column',
      children: distributeBlocksIntoColumns(convertedComponents, columnCount),
      style: {
        padding: '16px',
        border: '1px solid rgb(229, 231, 235)',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        flexDirection: columnCount === 1 ? 'column' : 'row',
      },
    },
  ];
};

// ---------------------------------------------------------------------------
// JSON parsing — tolerant of common LLM mistakes:
//   - markdown fences
//   - trailing commas before } or ]
//   - truncated output (auto-closes open { [ )
//   - single-quoted strings
// ---------------------------------------------------------------------------
const stripTrailingCommas = (input: string) =>
  input.replace(/,(\s*[}\]])/g, '$1');

const autoCloseBrackets = (input: string) => {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' && stack[stack.length - 1] === '{') stack.pop();
    else if (ch === ']' && stack[stack.length - 1] === '[') stack.pop();
  }
  let out = input;
  if (inString) out += '"';
  // Trim a trailing comma/colon/partial-token before closing
  out = out.replace(/[,:]\s*$/, '').replace(/"\s*:\s*$/, '');
  while (stack.length > 0) {
    const open = stack.pop();
    out += open === '{' ? '}' : ']';
  }
  return out;
};

const parseModelJson = (content: unknown) => {
  if (isRecord(content)) return content;

  const text = safeString(content).trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  const attempts: Array<{ label: string; src: string }> = [
    { label: 'raw', src: stripped },
    { label: 'no-trailing-commas', src: stripTrailingCommas(stripped) },
  ];

  // Extract from { ... } window (handles preamble/postamble)
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const windowed = stripped.slice(start, end + 1);
    attempts.push({ label: 'object-window', src: windowed });
    attempts.push({ label: 'object-window-no-trailing-commas', src: stripTrailingCommas(windowed) });
  }

  // Last resort: auto-close brackets from the unclosed-tail
  if (start !== -1) {
    const fromOpen = stripped.slice(start);
    attempts.push({
      label: 'auto-close',
      src: stripTrailingCommas(autoCloseBrackets(fromOpen)),
    });
  }

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt.src);
    } catch (err) {
      lastErr = err;
    }
  }

  // Final fallback: jsonrepair handles missing colons, unquoted keys,
  // unescaped quotes, truncated output — every common LLM mistake.
  for (const attempt of attempts) {
    try {
      const repaired = jsonrepair(attempt.src);
      return JSON.parse(repaired);
    } catch (err) {
      lastErr = err;
    }
  }

  console.error('[parseModelJson] all parse attempts (including jsonrepair) failed. Raw model output:');
  console.error(stripped.slice(0, 4000));
  throw new Error(
    `Model output did not contain valid JSON: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
};

const sanitizeUserPrompt = (prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) return '';
  const looksLikeBuilderJson =
    trimmed.includes('"components"') ||
    (trimmed.includes('"uniqueId"') &&
      trimmed.includes('"children"') &&
      trimmed.includes('"style"'));
  if (!looksLikeBuilderJson) return trimmed;
  const textBeforeJson = trimmed.split(/[\[{]/)[0]?.trim();
  return [
    textBeforeJson,
    'The user included existing builder JSON only as a format reference. Ignore every text value, section name, color, and layout from that JSON unless it is visible in the image.',
  ]
    .filter(Boolean)
    .join('\n');
};

// ---------------------------------------------------------------------------
// Groq API — with retry on failed_generation
// ---------------------------------------------------------------------------
const callGroqApi = async (
  apiKey: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ temperature: 0.05, ...body }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('[Groq error]', response.status, JSON.stringify(payload?.error ?? payload, null, 2));
    throw new Error(payload?.error?.message || `Groq API error ${response.status}`);
  }

  return payload;
};

const callGroqJson = async (
  apiKey: string,
  body: {
    model: string;
    messages: unknown[];
    max_completion_tokens: number;
    temperature?: number;
  }
): Promise<Record<string, unknown>> => {
  try {
    return await callGroqApi(apiKey, {
      ...body,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : '').toLowerCase();
    if (
      msg.includes('failed_generation') ||
      msg.includes('failed to generate') ||
      msg.includes('stop_reason')
    ) {
      console.warn('[Groq] json_object mode failed — retrying without response_format');
      return await callGroqApi(apiKey, { ...body });
    }
    throw err;
  }
};

const getGroqMessageContent = (payload: Record<string, unknown>) => {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return '';

  return firstChoice.message.content;
};

// ---------------------------------------------------------------------------
// Gemini API — used for Pass-1 analysis when GEMINI_API_KEY is set, because
// gemini-2.5-flash reads screenshots far more accurately than Llama 4 Scout
// (font families, exact hex colors, pixel spacing).
// ---------------------------------------------------------------------------
type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

const groqContentToGeminiParts = (
  parts: GroqContentPart[],
  fallbackImageDataUrl: string
): GeminiPart[] => {
  return parts
    .map<GeminiPart | null>((part) => {
      if (part.type === 'text') return { text: part.text };
      if (part.type === 'image_url') {
        const url = part.image_url.url || fallbackImageDataUrl;
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return null;
        return { inline_data: { mime_type: match[1], data: match[2] } };
      }
      return null;
    })
    .filter((p): p is GeminiPart => Boolean(p));
};

const callGeminiJson = async (
  apiKey: string,
  model: string,
  parts: GeminiPart[],
  maxOutputTokens: number,
  temperature = 0.05
): Promise<Record<string, unknown>> => {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
        maxOutputTokens,
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('[Gemini error]', response.status, JSON.stringify(payload?.error ?? payload, null, 2));
    throw new Error(payload?.error?.message || `Gemini API error ${response.status}`);
  }

  return payload as Record<string, unknown>;
};

const getGeminiText = (payload: Record<string, unknown>): string => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const first = candidates[0];
  if (!isRecord(first) || !isRecord(first.content)) return '';
  const parts = Array.isArray(first.content.parts) ? first.content.parts : [];
  return parts
    .map((p) => (isRecord(p) && typeof p.text === 'string' ? p.text : ''))
    .join('');
};

// ---------------------------------------------------------------------------
// Pass 1: Analysis — explicitly identifies column count, block types, and
// which column each element belongs to.
// ---------------------------------------------------------------------------
const buildAnalysisContent = ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  paletteHint,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  paletteHint: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `You are analyzing a webpage screenshot to map it to an editor block system. Your goal is PIXEL-PERFECT VISUAL FIDELITY — capture every visible color, font, spacing, and style.

${focusInstruction}

${VISUAL_FIDELITY_RULES}

${paletteHint}

LAYOUT GRID DETECTION — DO THIS FIRST, BEFORE LISTING ELEMENTS:
For each visible section of the page, look at the horizontal positions of its content.
- If you can draw 3 vertical guide lines that separate distinct content groups left-to-right, the section has columnCount:3 — even if the columns have different widths.
- If you can draw 2 vertical guide lines, columnCount:2.
- A heading on the LEFT and a stack of cards/progress bars/timers on the RIGHT is at MINIMUM a 2-column. If the right side itself has two visibly separated stacks of content, the whole section is a 3-column.
- DO NOT collapse 3 columns into 2. If you see content in the LEFT THIRD, MIDDLE THIRD, and RIGHT THIRD of the screenshot, that is THREE columns.
- A timer/countdown sitting visually apart from a stack of progress bars belongs in a DIFFERENT column from the progress bars — even if both are on the right half of the page.
- Trust horizontal position more than logical grouping. If two elements are at clearly different X positions, they are in different columns.

VERIFICATION CHECK (run this mentally before outputting):
For every section you marked as columnCount:2, ask: "Is there a third visually-separated content area I'm missing?" If yes, it's a 3-column. Similarly check 1-column → could it be 2?

The editor has these block ids:
CONTAINERS (have children): nav-bar, 1-column, 2-column, 3-column, row
LEAF BLOCKS (no children): text, heading, button, icon, card, image, stats, progress, countdown, shape-divider, input, textarea, radio, checkbox, switch, table, tabs, avatar, separator, skeleton

KEY MAPPING RULES:
- A large number with a label below it (e.g. "200+ / Project Delivered") = blockId:"stats", statsValue:"200+", statsLabel:"Project Delivered"
- A horizontal bar with a label and percentage (e.g. "Delivery Rate 100%") = blockId:"progress"
- A timer with days/hours/minutes/seconds = blockId:"countdown"
- A large bold title = blockId:"heading"
- A paragraph of text = blockId:"text"
- A clickable button = blockId:"button"
- Navigation bar with logo and links = containerBlockId:"nav-bar" (also use as section)
- Three side-by-side columns = containerBlockId:"3-column", columnCount:3
- Two side-by-side columns = containerBlockId:"2-column", columnCount:2
- One full-width column = containerBlockId:"1-column", columnCount:1

Return ONLY this JSON (no markdown, no fences):
{
  "scope": "full-page|section|viewport",
  "globalFontFamily": "Inter, system-ui, sans-serif",
  "sections": [
    {
      "order": 1,
      "name": "section name",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 3,
      "backgroundColor": "#1e2330",
      "backgroundImage": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) — only if a gradient is visible, otherwise omit",
      "padding": "96px 64px",
      "gap": "32px",
      "alignItems": "center|flex-start|stretch",
      "justifyContent": "center|flex-start|space-between",
      "borderRadius": "0px",
      "borderTop": "1px solid #e5e7eb — only if visible",
      "elements": [
        {
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image|...",
          "column": 0,
          "text": "visible text only — verbatim, including punctuation and capitalization",
          "statsValue": "200+",
          "statsLabel": "Project Delivered",
          "progressLabel": "Delivery Rate",
          "progressPercentage": 100,
          "iconName": "lucide icon name if blockId=icon",
          "cardData": {"eyebrow":"","title":"","body":"","buttonText":"","image":"/placeholder-image.png"},
          "imageAlt": "precise description of what the image shows (for image blocks)",
          "color": "#hex text color sampled from image",
          "backgroundColor": "#hex element background (buttons, badges, cards)",
          "backgroundImage": "linear-gradient(...) — only if element has a gradient bg",
          "fontFamily": "Inter, system-ui, sans-serif",
          "fontSize": "48px",
          "fontWeight": "700",
          "fontStyle": "normal|italic",
          "lineHeight": "1.2",
          "letterSpacing": "-0.02em",
          "textAlign": "left|center|right",
          "textTransform": "none|uppercase|lowercase|capitalize",
          "padding": "12px 24px",
          "margin": "0 0 16px 0",
          "borderRadius": "8px",
          "border": "1px solid #e5e7eb",
          "boxShadow": "0 4px 12px rgba(0,0,0,0.08)",
          "width": "auto|100%|320px",
          "maxWidth": "640px",
          "opacity": "1",
          "styleNotes": "anything else that makes this element look the way it does"
        }
      ]
    }
  ]
}

User request: ${prompt || 'Recreate the visible screenshot.'}
${requestedLayoutInstruction ? `Layout requirement: ${requestedLayoutInstruction}` : ''}

CRITICAL RULES:
- List ALL visible sections top-to-bottom. Do not skip any.
- For each section, correctly identify columnCount by counting side-by-side groups.
- Assign each element to the correct 0-based column index.
- Elements in the LEFT column get column:0, MIDDLE column:1, RIGHT column:2.
- Use stats/progress/countdown blocks — never use plain "text" for numbers+labels or progress bars.
- Do not include elements not visible in the image.
- FONT FAMILY IS REQUIRED on every text element. Look carefully — is it sans-serif, serif, or mono? Geometric (Poppins, DM Sans) or humanist (Open Sans, Lato)? Modern (Inter) or traditional (Helvetica)? Pick the closest match and use the full CSS stack.
- EXACT COLORS REQUIRED. Sample with your eyes. Distinguish #111827 (slate-900) from #000000 (pure black). Distinguish #2563EB (blue-600) from #3B82F6 (blue-500). Use 6-digit hex.
- MEASURE SPACING. A tight card has 16px-24px padding; a hero has 64px-128px padding. Buttons typically use 12px 24px or 16px 32px. Don't default everything to "16px".
- OMIT fields that don't apply (e.g. boxShadow on a flat card) — don't fill them with empty strings.`,
  },
];

// ---------------------------------------------------------------------------
// Pass 1 (TEXT-ONLY): Plan a complete, deploy-ready landing page from a topic
// prompt — no screenshot involved. Emits the same `sections[]` analysis schema
// as the image flow so Pass-2 stays unchanged.
// ---------------------------------------------------------------------------
const buildTextOnlyPlannerContent = ({
  prompt,
  requestedLayoutInstruction,
  pageType,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  pageType: PageContext;
}): GroqContentPart[] => {
  const pageScopeBlock =
    pageType === 'header'
      ? `SCOPE — HEADER PAGE ONLY:
- Output EXACTLY one section: containerBlockId:"nav-bar", columnCount:1.
- That section's elements describe the navigation: brand name + 4-6 nav links + (optional) CTA button.
- Do NOT plan a hero, services, footer or any body sections.`
      : pageType === 'footer'
        ? `SCOPE — FOOTER PAGE ONLY:
- Output 1-2 sections that form a typical site footer.
- A 3-column or 4-column section with link groups (Company / Product / Resources / Legal) + a 1-column copyright row at the bottom.
- Each link group is a column containing one heading + 4-6 text links (use blockId:"text", each on its own row).
- Do NOT plan a hero, services, testimonials, or any body sections.
- Use a dark background (e.g. #0F172A or #111827) with light text.`
        : `SCOPE — FULL LANDING PAGE:
- Plan a complete, deploy-ready home page tailored to the user's topic.
- Default section flow (skip a section only if it makes no sense for the topic, add a section if the topic clearly needs it):
   1. nav-bar (containerBlockId:"nav-bar", columnCount:1) — brand + 4-6 links + primary CTA button
   2. Hero — MUST be containerBlockId:"2-column", columnCount:2. Left column: eyebrow tag + large headline + supporting subhead + 2 CTA buttons. Right column: ONE element with blockId:"image", imageAlt set to a topic-specific description (e.g. "modern IT operations center with dashboards", "developers collaborating around a laptop", "fintech mobile app on a phone screen"). DO NOT skip the image.
   3. Trust strip / logo cloud (1-column) — small heading "Trusted by teams at" + a row of company/text logos
   4. Services or features grid (3-column) — 3 cards (one per column), each as blockId:"card" with cardData {eyebrow, title, body, buttonText, image:"/placeholder-image.png"}. The image field MUST be present with that placeholder string — the system will swap in a real topic photo automatically.
   5. Stats band (3-column or 4-column on dark bg) — 3-4 stats blocks ("200+ Projects", "98% Uptime", "12yr Experience")
   6. Why-us / value props — MUST be containerBlockId:"2-column", columnCount:2. One column has ONE blockId:"image" element with a topic-specific imageAlt (e.g. "engineer reviewing code on multiple monitors"). The other column has a heading + 3-4 feature rows (each row = icon + heading + text). DO NOT skip the image.
   7. Testimonials (3-column) — 3 cards (one per column), each blockId:"card" with cardData {eyebrow: client role, title: client name, body: 2-sentence quote, image:"/placeholder-image.png", buttonText:""}. The image becomes the client headshot — placeholder is fine, system swaps it.
   8. Pricing or CTA section (3-column for pricing, 1-column for CTA) — pricing has 3 plan cards (Starter / Pro / Enterprise); skip pricing and use a single big CTA when the topic is services-focused (agency, IT, consulting).
   9. Final CTA (1-column) — bold headline + sub-line + primary CTA button on a dark or gradient background
  10. Footer (3-column) — link groups + copyright. ONLY include if the user asks for a "full page" or "with header and footer"; otherwise omit and let the global footer handle it.
- A "home page" prompt should produce 7-9 sections by default. Do not produce only 2-3 sections.
- IMAGES ARE MANDATORY: hero must have an image, why-us must have an image, service cards must have cardData.image set (placeholder string is fine), testimonial cards must have cardData.image set. A page with no images is a failed output — never omit them.`;

  return [
    {
      type: 'text',
      text: `You are designing a real, deploy-ready webpage from a text brief. There is NO screenshot. Plan a full page from scratch and output the structured "analysis" JSON our pipeline consumes.

USER BRIEF: ${prompt}
${requestedLayoutInstruction ? `\nLayout requirement: ${requestedLayoutInstruction}` : ''}

${pageScopeBlock}

DESIGN DIRECTION — make it look authentic, not generic:
- INFER THE INDUSTRY from the brief (e.g. "IT services", "SaaS", "law firm", "restaurant", "bakery", "fintech", "fitness app"). Pick design choices appropriate to that industry.
- COLOR PALETTE — invent a small, consistent palette (1 background, 1 surface, 1 text, 1 accent, 1 muted-text) and reuse it across all sections. Industry cues:
   - IT / tech / SaaS / fintech: deep navy or near-black bg (#0B1220, #0F172A) with a vivid accent (electric blue #2563EB, indigo #6366F1, cyan #06B6D4, or violet #7C3AED). Light sections use #FFFFFF / #F8FAFC.
   - Agency / creative: warm cream (#FAF7F2) + bold accent (#FF6B35, #E11D48) with charcoal text.
   - Healthcare / wellness: soft white + teal/green accent (#0D9488, #16A34A).
   - Finance / legal: navy + gold accent (#0F1F3D + #B8932A) or muted slate.
   - Restaurant / hospitality: warm beige / dark forest + amber accent.
   - Use 6-digit hex EVERYWHERE. Never named colors.
- TYPOGRAPHY — pick one display font and one body font from this shortlist and reuse them:
   - Display options: Poppins, Montserrat, "Plus Jakarta Sans", "Playfair Display"
   - Body options: Inter, "DM Sans", "Open Sans", Roboto
   - Set analysis.globalFontFamily to the body font CSS stack (e.g. "Inter, system-ui, sans-serif"). Override fontFamily on headings/buttons with the display font stack.
- COPY — write SPECIFIC, AUTHENTIC copy tailored to the topic. NEVER write "Lorem ipsum", "Your headline here", "Sample text", or generic filler. A heading for an IT site should read like "Enterprise IT solutions that scale with you" — not "Welcome to our website". Use plausible company-style language: short, confident, benefit-driven.
- STATS — invent plausible numbers ("200+ projects delivered", "98% client retention", "24/7 SOC monitoring", "15yr industry experience"). They should reinforce the topic.
- TESTIMONIALS — write 2-3 sentence quotes with a believable name + role + company ("Sarah Lin, CTO at Northwind Logistics"). Make them topic-specific.
- ICONS — use real lucide icon names matching each feature/card. For IT: "shield-check", "cloud", "server", "lock", "zap", "users", "code", "git-branch", "monitor", "database", "wifi", "cpu". For SaaS: "rocket", "trending-up", "bar-chart-3", "workflow". Pick ones that actually exist.
- SPACING — sections should breathe. Hero padding 96px-128px vertical. Other sections 80px-96px vertical. Side padding 64px-128px on a desktop layout. Gaps between cards 24px-32px. Don't default to 16px.
- VISUAL VARIETY — alternate light and dark sections to add rhythm. The hero might be light, stats on dark, services on light, testimonials on a tinted surface, final CTA on a gradient.
- BUTTONS — primary CTAs use the accent color background with white text, 12-16px vertical padding, 24-32px horizontal padding, 8px or 10px border-radius. Secondary CTAs use a subtle border + transparent bg.

OUTPUT FORMAT — RETURN ONLY THIS JSON (no markdown, no fences):
{
  "scope": "full-page",
  "globalFontFamily": "Inter, system-ui, sans-serif",
  "sections": [
    {
      "order": 1,
      "name": "Hero",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 1,
      "backgroundColor": "#0F172A",
      "backgroundImage": "linear-gradient(...) — only if section uses a gradient bg",
      "padding": "112px 96px",
      "gap": "24px",
      "alignItems": "center|flex-start|stretch",
      "justifyContent": "center|flex-start",
      "elements": [
        {
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image",
          "column": 0,
          "text": "the actual visible text for this element — written for the user's topic, not placeholder",
          "iconName": "lucide icon name when blockId=icon",
          "statsValue": "200+",
          "statsLabel": "Projects delivered",
          "progressLabel": "Uptime",
          "progressPercentage": 99,
          "cardData": {"eyebrow":"","title":"","body":"","buttonText":"","image":"/placeholder-image.png"},
          "imageAlt": "describe what image should go here",
          "color": "#hex",
          "backgroundColor": "#hex (for buttons / chips / cards)",
          "backgroundImage": "linear-gradient(...) — only when element has gradient bg",
          "fontFamily": "Poppins, system-ui, sans-serif",
          "fontSize": "60px",
          "fontWeight": "700",
          "lineHeight": "1.1",
          "letterSpacing": "-0.02em",
          "textAlign": "left|center|right",
          "textTransform": "none|uppercase",
          "padding": "14px 28px",
          "margin": "0 0 16px 0",
          "borderRadius": "10px",
          "border": "1px solid #hex (only when visible)",
          "boxShadow": "0 10px 30px rgba(0,0,0,0.12) (only when visible)",
          "maxWidth": "640px"
        }
      ]
    }
  ]
}

CRITICAL RULES:
- Distribute elements correctly across columns: a 3-column section has elements with column:0, column:1, column:2.
- For services/features grids (3-column): each column holds ONE card block (eyebrow/title/body/buttonText/image) OR an icon + heading + text trio. Be consistent within a section.
- For stats bands (3-column or 4-column): each column holds ONE stats block.
- For testimonial grids (3-column): each column holds ONE card with the quote in body, author name in title, role in eyebrow.
- The nav-bar section has containerBlockId:"nav-bar", columnCount:1, and exactly ONE element with blockId:"nav-bar". Provide a navData field on that element: {"logo":"Brand name appropriate to the topic","logoType":"text","layout":"horizontal","links":[{"label":"Home","href":"#"},{"label":"Services","href":"#services"},{"label":"About","href":"#about"},{"label":"Pricing","href":"#pricing"},{"label":"Contact","href":"#contact"}]}. Pick a real-feeling brand name (e.g. "Corecore IT", "Nimbus Cloud", "Apex Legal") rather than the word "Brand".
- Every text element MUST have fontFamily, fontSize, fontWeight, lineHeight, color, textAlign.
- Every container MUST have backgroundColor (or backgroundImage), padding, gap.
- All hex colors must be 6-digit #RRGGBB.
- Do NOT include sections that are not visually distinct. No empty filler sections.
- Use blocks the catalog actually supports — never invent block ids.`,
    },
  ];
};

// ---------------------------------------------------------------------------
// Pass 2: JSON generation — converts structured analysis into builder JSON
// ---------------------------------------------------------------------------
const buildJsonGenerationContent = ({
  prompt,
  requestedLayoutInstruction,
  visibleAnalysis,
  imageDataUrl,
  focusInstruction,
  paletteHint,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  visibleAnalysis: unknown;
  imageDataUrl: string;
  focusInstruction: string;
  paletteHint: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `Convert this analysis into editor builder JSON. Preserve EVERY style detail from the analysis so the output is pixel-identical to the source screenshot.

${focusInstruction}

${VISUAL_FIDELITY_RULES}

${paletteHint}

ANALYSIS:
${JSON.stringify(visibleAnalysis, null, 2)}

User request: ${prompt || 'Recreate the visible screenshot.'}
${requestedLayoutInstruction ? `Layout requirement: ${requestedLayoutInstruction}` : ''}

STEP BY STEP:
1. For each section in analysis.sections (in order), create one top-level block.
   - Use section.containerBlockId as the block id.
   - Set type based on catalog: nav-bar->nav-bar, 1-column/2-column/3-column->column.
2. Set children as an array of exactly section.columnCount sub-arrays: [[], [], ...].
3. Place each element into children[element.column] as a leaf block.
4. For STATS blocks: content = JSON.stringify({"value": element.statsValue, "label": element.statsLabel})
5. For PROGRESS blocks: content = JSON.stringify({"label": element.progressLabel, "percentage": element.progressPercentage})
6. For COUNTDOWN blocks: content = JSON.stringify({"days":"0","hours":"00","minutes":"00","seconds":"00"})
7. For HEADING blocks: id="heading", type="text", content = element.text
8. For TEXT blocks: id="text", type="text", content = element.text
9. For ICON blocks: content = element.iconName
10. For CARD blocks: content = JSON.stringify({...element.cardData, image: element.cardData.image || "/placeholder-image.png"})
11. For IMAGE blocks: content = JSON.stringify({"src": element.imageSrc || "/placeholder-image.png", "alt": element.imageAlt || "image", "caption": ""}). The src may be an external https URL — preserve it verbatim, do not rewrite or normalize.
12. For NAV-BAR sections — the section contains ONE element with blockId:"nav-bar". Emit a single top-level block with id:"nav-bar", type:"nav-bar", NO children, and content = JSON.stringify(element.navData) if element.navData is provided. If navData is missing, fall back to {"logo": element.text || "Brand", "logoType":"text","logoImage":"","layout":"horizontal","links":[{"label":"Home","href":"#","onClick":"none","onClickValue":""},{"label":"Services","href":"#services","onClick":"none","onClickValue":""},{"label":"About","href":"#about","onClick":"none","onClickValue":""},{"label":"Contact","href":"#contact","onClick":"none","onClickValue":""}]}. Each link MUST have onClick:"none" and onClickValue:"" — add those defaults if navData.links entries are missing them. Style on the nav-bar block carries section-level padding/backgroundColor/color.

CONTAINER STYLE (apply ALL from analysis section):
- backgroundColor: section.backgroundColor
- backgroundImage: section.backgroundImage (if present — for gradients)
- padding: section.padding (preserve the EXACT value, e.g. "96px 64px" — do NOT default to "48px 32px")
- gap: section.gap (preserve EXACT value)
- alignItems: section.alignItems
- justifyContent: section.justifyContent
- borderRadius: section.borderRadius (if present)
- borderTop / borderBottom: if present
- For 2-col and 3-col: display:"flex", flexDirection:"row", width:"100%"
- For 1-col: display:"flex", flexDirection:"column", width:"100%"

ELEMENT STYLE — APPLY EVERY FIELD FROM THE ANALYSIS, do not drop any:
- color, backgroundColor, backgroundImage
- fontFamily (REQUIRED — copy verbatim from element.fontFamily, e.g. "Inter, system-ui, sans-serif")
- fontSize, fontWeight, fontStyle
- lineHeight, letterSpacing
- textAlign, textTransform
- padding, margin
- borderRadius, border, boxShadow
- width, maxWidth, opacity
- If element.backgroundImage is a gradient string, set style.backgroundImage AND omit backgroundColor.

GLOBAL FONT (if analysis.globalFontFamily is set):
- Apply analysis.globalFontFamily to every text element that does NOT have its own fontFamily.

VALIDATION (check before returning):
- Every 2-column block must have children with EXACTLY 2 arrays.
- Every 3-column block must have children with EXACTLY 3 arrays.
- NEVER place all elements into children[0] — distribute them across column arrays by their element.column value.
- A 3-column block with children: [[a,b,c,d,e],[],[]] is WRONG. Distribute correctly.
- For sections with columnCount > 1, the container MUST have style.display="flex" and style.flexDirection="row".
- Every heading/text/button MUST have a fontFamily in style.
- Every color value MUST be a 6-digit hex (#RRGGBB) — never named colors like "blue" or "white".
- Preserve element.padding, element.margin, element.borderRadius, element.boxShadow EXACTLY — do not normalize to round numbers.

Return ONLY: {"components":[...]}
No markdown. No explanation.`,
  },
  ...(imageDataUrl
    ? [{ type: 'image_url' as const, image_url: { url: imageDataUrl } }]
    : []),
];

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { message: 'Missing GROQ_API_KEY server environment variable' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const userPrompt = sanitizeUserPrompt(safeString(formData.get('prompt')));
    const image = formData.get('image');
    const hasImage = image instanceof File && image.size > 0;
    const prompt = userPrompt || (hasImage ? DEFAULT_IMAGE_RECREATE_PROMPT : '');
    const requestedLayout = detectRequestedLayout(prompt);
    const requestedLayoutInstruction = getRequestedLayoutInstruction(requestedLayout);
    const rawPageType = safeString(formData.get('pageType'), 'page').toLowerCase();
    const pageType: PageContext =
      rawPageType === 'header' ? 'header' : rawPageType === 'footer' ? 'footer' : 'page';
    const focusInstruction = getFocusInstruction(pageType);
    let imageDataUrl = '';
    let imageBuffer: Buffer | null = null;

    if (hasImage) {
      if (!image.type.startsWith('image/')) {
        return NextResponse.json({ message: 'Only image files are supported' }, { status: 400 });
      }
      if (image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { message: 'Image is too large. Maximum size is 8MB.' },
          { status: 400 }
        );
      }
      imageBuffer = Buffer.from(await image.arrayBuffer());
      imageDataUrl = `data:${image.type};base64,${imageBuffer.toString('base64')}`;
    }

    // -- PRE-PASS: programmatic palette extraction (free, no API call) ------
    // Sampled hex codes pinned into both prompts so the model can't hallucinate
    // colors. Falls back to LLM-only color reasoning if extraction fails.
    let extractedPalette: ExtractedPalette | null = null;
    let paletteHint = '';
    if (imageBuffer) {
      extractedPalette = await extractPalette(imageBuffer);
      if (extractedPalette) {
        paletteHint = formatPaletteForPrompt(extractedPalette);
      }
    }

    // -- PASS 1: structured analysis (image flow) OR full-page plan (text flow)
    const analysisContentParts = hasImage
      ? buildAnalysisContent({
          prompt,
          requestedLayoutInstruction,
          focusInstruction,
          paletteHint,
        })
      : buildTextOnlyPlannerContent({
          prompt,
          requestedLayoutInstruction,
          pageType,
        });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    // Use Gemini for both image-analysis (vision is much better than Llama) and
    // text-only planning (creative writing is much better than Llama).
    const useGeminiForAnalysis = Boolean(geminiApiKey);
    let analysisRawText = '';

    if (useGeminiForAnalysis) {
      const geminiParts: GeminiPart[] = [
        ...groqContentToGeminiParts(analysisContentParts, imageDataUrl),
        ...(hasImage && imageDataUrl
          ? groqContentToGeminiParts(
              [{ type: 'image_url' as const, image_url: { url: imageDataUrl } }],
              imageDataUrl
            )
          : []),
      ];
      try {
        const geminiPayload = await callGeminiJson(
          geminiApiKey!,
          GEMINI_MODEL,
          geminiParts,
          hasImage ? 8192 : 12288,
          // Creative planning benefits from a higher temp; image analysis must
          // stay deterministic to match the source pixel-for-pixel.
          hasImage ? 0.05 : 0.7
        );
        analysisRawText = getGeminiText(geminiPayload);
      } catch (err) {
        console.warn('[Gemini] analysis failed, falling back to Groq:', err);
      }
    }

    if (!analysisRawText) {
      // Text-only planner gets more tokens — full-page plans are large.
      const plannerTokens = hasImage ? 6144 : 8192;
      const analysisPayload = await callGroqJson(apiKey, {
        model: hasImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
        // Text-only planning benefits from a higher temperature so the model
        // produces specific, authentic copy instead of generic boilerplate.
        temperature: hasImage ? 0.05 : 0.7,
        messages: [
          {
            role: 'user',
            content: hasImage
              ? [...analysisContentParts, { type: 'image_url', image_url: { url: imageDataUrl } }]
              : analysisContentParts,
          },
        ],
        max_completion_tokens: plannerTokens,
      });
      analysisRawText = safeString(getGroqMessageContent(analysisPayload));
    }

    const rawAnalysis = parseModelJson(analysisRawText);

    // -- PASS 1.5: enrich analysis with real photos from Unsplash ------------
    // For every image/card element with a placeholder URL, swap in a real
    // topic-relevant photo so the generated page looks deploy-ready. Fails
    // open: on any error we fall through to the original placeholder.
    let visibleAnalysis: unknown = rawAnalysis;
    try {
      visibleAnalysis = await enrichAnalysisWithImages(rawAnalysis, prompt);
    } catch (err) {
      console.warn('[image enrichment] failed, using placeholders:', err);
      visibleAnalysis = rawAnalysis;
    }

    // -- PASS 2: generate builder JSON --------------------------------------
    const jsonGenerationMessage = buildJsonGenerationContent({
      prompt,
      requestedLayoutInstruction,
      visibleAnalysis,
      imageDataUrl,
      focusInstruction,
      paletteHint,
    });

    const useGeminiForGeneration = Boolean(geminiApiKey);
    let modelContent = '';
    let groqPayload: Record<string, unknown> | null = null;

    if (useGeminiForGeneration) {
      // Gemini equivalent of: [system, user] → single user turn prefixed with system instructions.
      const generationParts: GeminiPart[] = [
        { text: `${baseSystemPrompt}\n\n---\n\n` },
        ...groqContentToGeminiParts(jsonGenerationMessage, imageDataUrl),
      ];
      try {
        const geminiGenPayload = await callGeminiJson(
          geminiApiKey!,
          GEMINI_MODEL,
          generationParts,
          16384
        );
        modelContent = getGeminiText(geminiGenPayload);
      } catch (err) {
        console.warn('[Gemini] generation failed, falling back to Groq:', err);
      }
    }

    if (!modelContent) {
      groqPayload = await callGroqJson(apiKey, {
        model: hasImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: baseSystemPrompt },
          { role: 'user', content: jsonGenerationMessage },
        ],
        max_completion_tokens: 8192,
      });
      modelContent = safeString(getGroqMessageContent(groqPayload));
    }
    const parsed = parseModelJson(modelContent);
    const rawComponents = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.components)
        ? parsed.components
        : isRecord(parsed) && Array.isArray(parsed.blocks)
          ? parsed.blocks
          : [];

    const normalizeContext = { count: 0 };

    const components = rawComponents
      .map((block) => sanitizeBlock(block, 0, normalizeContext))
      .filter((block): block is BlockData => Boolean(block))
      .map(enforceColumnCounts)           // FIX 1: enforce correct col counts first
      .map(flattenSingleChildColumns)     // FIX 2: safe flatten (multi-col inner only)
      .map(ensureFlexOnMultiColumnContainers); // FIX 3: guarantee flex on multi-col

    const layoutAdjustedComponents = applyRequestedLayout(components, requestedLayout).map(
      applyEditorBlockDefaults
    );

    if (layoutAdjustedComponents.length === 0) {
      return NextResponse.json(
        { message: 'Groq returned JSON, but no valid builder components were found.' },
        { status: 422 }
      );
    }

    // -- POST-PASS-2: enrich image/card blocks with real photos -------------
    // Authoritative pass — walks the final BlockData tree and replaces any
    // placeholder src/image (which is what the renderer actually consumes)
    // with a real Unsplash/picsum URL. Independent of how the LLM emitted the
    // analysis, so this is the safety net that guarantees images show up.
    let finalComponents = layoutAdjustedComponents;
    try {
      finalComponents = await enrichComponentsWithImages(layoutAdjustedComponents, prompt);
    } catch (err) {
      console.warn('[image enrichment] post-pass failed:', err);
    }

    // -- PASS 3: when editing a regular page with an image, also extract the
    //    header and footer regions so the client can spin up matching pages.
    let headerComponents: BlockData[] | undefined;
    let footerComponents: BlockData[] | undefined;

    if (pageType === 'page' && hasImage) {
      const runFocusedExtraction = async (
        focus: PageContext
      ): Promise<BlockData[] | undefined> => {
        try {
          const instruction = getFocusInstruction(focus);
          const focusedAnalysisParts = buildAnalysisContent({
            prompt: `Extract ONLY the ${focus} of the image.`,
            requestedLayoutInstruction: '',
            focusInstruction: instruction,
            paletteHint,
          });
          let focusedAnalysisText = '';
          if (geminiApiKey) {
            try {
              const focusedGeminiParts: GeminiPart[] = [
                ...groqContentToGeminiParts(focusedAnalysisParts, imageDataUrl),
                ...groqContentToGeminiParts(
                  [{ type: 'image_url' as const, image_url: { url: imageDataUrl } }],
                  imageDataUrl
                ),
              ];
              const focusedGeminiPayload = await callGeminiJson(
                geminiApiKey,
                GEMINI_MODEL,
                focusedGeminiParts,
                4096
              );
              focusedAnalysisText = getGeminiText(focusedGeminiPayload);
            } catch (err) {
              console.warn(`[Gemini] focused ${focus} analysis failed, falling back to Groq:`, err);
            }
          }
          if (!focusedAnalysisText) {
            const focusedAnalysisPayload = await callGroqJson(apiKey, {
              model: GROQ_VISION_MODEL,
              messages: [
                {
                  role: 'user',
                  content: [
                    ...focusedAnalysisParts,
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                  ],
                },
              ],
              max_completion_tokens: 3072,
            });
            focusedAnalysisText = safeString(getGroqMessageContent(focusedAnalysisPayload));
          }
          const focusedAnalysis = parseModelJson(focusedAnalysisText);

          const focusedJsonParts = buildJsonGenerationContent({
            prompt: `Extract ONLY the ${focus} of the image.`,
            requestedLayoutInstruction: '',
            visibleAnalysis: focusedAnalysis,
            imageDataUrl,
            focusInstruction: instruction,
            paletteHint,
          });
          let focusedContent: unknown = '';
          if (geminiApiKey) {
            try {
              const focusedGenParts: GeminiPart[] = [
                { text: `${baseSystemPrompt}\n\n---\n\n` },
                ...groqContentToGeminiParts(focusedJsonParts, imageDataUrl),
              ];
              const focusedGeminiPayload = await callGeminiJson(
                geminiApiKey,
                GEMINI_MODEL,
                focusedGenParts,
                8192
              );
              focusedContent = getGeminiText(focusedGeminiPayload);
            } catch (err) {
              console.warn(`[Gemini] focused ${focus} generation failed, falling back to Groq:`, err);
            }
          }
          if (!focusedContent) {
            const focusedJsonPayload = await callGroqJson(apiKey, {
              model: GROQ_VISION_MODEL,
              messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: focusedJsonParts },
              ],
              max_completion_tokens: 6144,
            });
            focusedContent = getGroqMessageContent(focusedJsonPayload);
          }
          const focusedParsed = parseModelJson(focusedContent);
          const focusedRaw = Array.isArray(focusedParsed)
            ? focusedParsed
            : isRecord(focusedParsed) && Array.isArray(focusedParsed.components)
              ? focusedParsed.components
              : isRecord(focusedParsed) && Array.isArray(focusedParsed.blocks)
                ? focusedParsed.blocks
                : [];
          const ctx = { count: 0 };
          const focusedComponents = focusedRaw
            .map((block: unknown) => sanitizeBlock(block, 0, ctx))
            .filter((block: BlockData | null): block is BlockData => Boolean(block))
            .map(enforceColumnCounts)
            .map(flattenSingleChildColumns)
            .map(ensureFlexOnMultiColumnContainers)
            .map(applyEditorBlockDefaults);
          return focusedComponents.length > 0 ? focusedComponents : undefined;
        } catch (err) {
          console.warn(`[Groq] focused ${focus} extraction failed:`, err);
          return undefined;
        }
      };

      const [headerResult, footerResult] = await Promise.all([
        runFocusedExtraction('header'),
        runFocusedExtraction('footer'),
      ]);
      headerComponents = headerResult;
      footerComponents = footerResult;
    }

    return NextResponse.json({
      components: finalComponents,
      headerComponents,
      footerComponents,
      analysis: visibleAnalysis,
      palette: extractedPalette,
      requestedLayout,
      pageType,
      model: useGeminiForGeneration ? GEMINI_MODEL : GROQ_VISION_MODEL,
      analysisModel: useGeminiForAnalysis ? GEMINI_MODEL : GROQ_VISION_MODEL,
      generationModel: useGeminiForGeneration ? GEMINI_MODEL : GROQ_VISION_MODEL,
      usage: groqPayload?.usage,
    });
  } catch (error) {
    console.error('AI page JSON generation failed:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}
