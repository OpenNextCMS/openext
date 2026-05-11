import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { CSSProperties } from 'react';
import type { BlockData } from '@/types';
import {
  aiEditorBlocksById,
  aiEditorBlocksByType,
  aiEditorBlockTypes,
  type AiEditorBlock,
} from './block-catalog';

export const runtime = 'nodejs';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || GROQ_VISION_MODEL;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BLOCKS = 120;
const MAX_DEPTH = 7;
const DEFAULT_IMAGE_RECREATE_PROMPT =
  'Recreate the uploaded image as closely as possible as a webpage in the editor. Match the visible layout, sections, colors, spacing, typography, buttons, cards, icons, and readable text using only editor blocks.';

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
    uniqueId: safeString(value.uniqueId) || crypto.randomUUID(),
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
// JSON parsing
// ---------------------------------------------------------------------------
const parseModelJson = (content: unknown) => {
  if (isRecord(content)) return content;

  const text = safeString(content).trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // Extract JSON object from free-form text (retry fallback)
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw new Error('Model output did not contain valid JSON');
  }
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
// Pass 1: Analysis — explicitly identifies column count, block types, and
// which column each element belongs to.
// ---------------------------------------------------------------------------
const buildAnalysisContent = ({
  prompt,
  requestedLayoutInstruction,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `You are analyzing a webpage screenshot to map it to an editor block system.

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
  "sections": [
    {
      "order": 1,
      "name": "section name",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 3,
      "backgroundColor": "#1e2330",
      "padding": "48px 32px",
      "elements": [
        {
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image|...",
          "column": 0,
          "text": "visible text only",
          "statsValue": "200+",
          "statsLabel": "Project Delivered",
          "progressLabel": "Delivery Rate",
          "progressPercentage": 100,
          "iconName": "lucide icon name if blockId=icon",
          "cardData": {"eyebrow":"","title":"","body":"","buttonText":""},
          "color": "#hex text color",
          "fontSize": "24px",
          "fontWeight": "700",
          "styleNotes": "any other style notes"
        }
      ]
    }
  ]
}

User request: ${prompt || 'Recreate the visible screenshot.'}
${requestedLayoutInstruction ? `Layout requirement: ${requestedLayoutInstruction}` : ''}

Rules:
- List ALL visible sections top-to-bottom. Do not skip any.
- For each section, correctly identify columnCount by counting side-by-side groups.
- Assign each element to the correct 0-based column index.
- Elements in the LEFT column get column:0, MIDDLE column:1, RIGHT column:2.
- Use stats/progress/countdown blocks — never use plain "text" for numbers+labels or progress bars.
- Do not include elements not visible in the image.`,
  },
];

// ---------------------------------------------------------------------------
// Pass 2: JSON generation — converts structured analysis into builder JSON
// ---------------------------------------------------------------------------
const buildJsonGenerationContent = ({
  prompt,
  requestedLayoutInstruction,
  visibleAnalysis,
  imageDataUrl,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  visibleAnalysis: unknown;
  imageDataUrl: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `Convert this analysis into editor builder JSON.

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
10. For CARD blocks: content = JSON.stringify(element.cardData)
11. Set container style.backgroundColor from section.backgroundColor.
12. Set container style: display:"flex", flexDirection:"row" (for 2-col and 3-col), gap:"32px", padding: section.padding or "48px 32px", width:"100%", alignItems:"flex-start".
13. Set 1-column container style: display:"flex", flexDirection:"column".
14. Set element text color from element.color. Set fontSize from element.fontSize. Set fontWeight from element.fontWeight.

VALIDATION (check before returning):
- Every 2-column block must have children with EXACTLY 2 arrays.
- Every 3-column block must have children with EXACTLY 3 arrays.
- NEVER place all elements into children[0] — distribute them across column arrays by their element.column value.
- A 3-column block with children: [[a,b,c,d,e],[],[]] is WRONG. Distribute correctly.
- For sections with columnCount > 1, the container MUST have style.display="flex" and style.flexDirection="row".

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
    let imageDataUrl = '';

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
      const buffer = Buffer.from(await image.arrayBuffer());
      imageDataUrl = `data:${image.type};base64,${buffer.toString('base64')}`;
    }

    // -- PASS 1: structured visual analysis ---------------------------------
    const analysisContentParts = buildAnalysisContent({ prompt, requestedLayoutInstruction });

    const analysisPayload = await callGroqJson(apiKey, {
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: hasImage
            ? [...analysisContentParts, { type: 'image_url', image_url: { url: imageDataUrl } }]
            : analysisContentParts,
        },
      ],
      max_completion_tokens: 2048,
    });

    const visibleAnalysis = parseModelJson(getGroqMessageContent(analysisPayload));

    // -- PASS 2: generate builder JSON --------------------------------------
    const jsonGenerationMessage = buildJsonGenerationContent({
      prompt,
      requestedLayoutInstruction,
      visibleAnalysis,
      imageDataUrl,
    });

    const groqPayload = await callGroqJson(apiKey, {
      model: hasImage ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
      messages: [
        { role: 'system', content: baseSystemPrompt },
        { role: 'user', content: jsonGenerationMessage },
      ],
      max_completion_tokens: 8192,
    });

    const modelContent = getGroqMessageContent(groqPayload);
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

    return NextResponse.json({
      components: layoutAdjustedComponents,
      analysis: visibleAnalysis,
      requestedLayout,
      model: GROQ_VISION_MODEL,
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
