import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { CSSProperties } from 'react';
import type { BlockData } from '@/types';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import { getSettingsModel, getUserDbConnection } from '@/utils/db';
import {
  aiEditorBlocksById,
  aiEditorBlocksByType,
  aiEditorBlockTypes,
  type AiEditorBlock,
} from './block-catalog';

export const runtime = 'nodejs';

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BLOCKS = 120;
const MAX_DEPTH = 7;
const DEFAULT_IMAGE_RECREATE_PROMPT =
  'Recreate the uploaded image as closely as possible as a webpage in the editor. Match the visible layout, sections, colors, spacing, typography, buttons, cards, icons, and readable text using only editor blocks.';

const STRICT_ANALYSIS_RULES = `STRICT ANALYSIS RULES:
- Output valid JSON only. No markdown, no prefixes, no explanations.
- Ensure all IDs, types, and styles match the allowed catalog exactly.
- Strictly adhere to the requested column counts.
- Use only recognized block types.`;

const STRICT_BUILDER_RULES = `STRICT BUILDER RULES:
- Generate valid JSON conforming exactly to the block catalog structure.
- Every container block MUST have a "children" array.
- Leaf blocks must NOT have a "children" array.
- All styles must be valid CSS properties.`;

type PageContext = 'page' | 'header' | 'footer';
type AnalysisProvider = 'gemini' | 'groq' | 'openrouter';

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

const getAiRuntimeConfig = async () => {
  const dynamicEnv = getDynamicEnv();
  const env = { ...process.env, ...dynamicEnv };
  let aiConfig: Record<string, unknown> = {};

  try {
    await getUserDbConnection();
    const SettingsModel = getSettingsModel();
    const settings = await SettingsModel.findOne({}).select('aiConfig').lean().exec();
    aiConfig = (settings?.aiConfig || {}) as Record<string, unknown>;
  } catch (error) {
    console.warn('[AI] Failed to load DB AI settings, falling back to env:', error);
  }

  const getConfigValue = (dbKey: string, envKey: string, fallback = '') => {
    const dbValue = aiConfig[dbKey];
    return typeof dbValue === 'string' && dbValue.trim()
      ? dbValue.trim()
      : env[envKey] || fallback;
  };

  return {
    openrouterApiKey: getConfigValue('openrouterApiKey', 'OPENROUTER_API_KEY'),
    openrouterModel: getConfigValue(
      'openrouterModel',
      'OPENROUTER_MODEL',
      'google/gemini-2.0-flash-001'
    ),
    openrouterReviewModel: getConfigValue(
      'openrouterReviewModel',
      'OPENROUTER_REVIEW_MODEL',
      'google/gemini-2.0-flash-001'
    ),
    minQualityScore: Number(aiConfig.aiMinQualityScore || env.AI_MIN_QUALITY_SCORE || '80'),
  };
};
type AiRuntimeConfig = Awaited<ReturnType<typeof getAiRuntimeConfig>>;

const getOpenRouterApiKey = (config: AiRuntimeConfig) => config.openrouterApiKey.trim();

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

const stripBlockChildren = (block: BlockData): BlockData => {
  const nextBlock = { ...block };
  delete nextBlock.children;
  return nextBlock;
};

const enforcePageScope = (components: BlockData[], pageType: PageContext): BlockData[] => {
  if (pageType === 'header') {
    const navBlock = components.find((block) => block.id === 'nav-bar' || block.type === 'nav-bar');
    return navBlock ? [stripBlockChildren({ ...navBlock, id: 'nav-bar', type: 'nav-bar' })] : [];
  }

  if (pageType === 'page') {
    return components.filter((block) => block.id !== 'nav-bar' && block.type !== 'nav-bar');
  }

  return components.filter((block) => block.id !== 'nav-bar' && block.type !== 'nav-bar');
};

const getStyleString = (style: CSSProperties | undefined, key: string) => {
  const value = (style as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' ? value : '';
};

const hexToRgb = (color: string) => {
  const normalized = color.trim().replace('#', '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(normalized)) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};

const getRelativeLuminance = (color: string) => {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
};

const isDarkColor = (color: string) => {
  const luminance = getRelativeLuminance(color);
  return luminance !== null && luminance < 0.28;
};

const repairDarkSectionContrast = (block: BlockData, parentIsDark = false): BlockData => {
  const backgroundColor = getStyleString(block.style, 'backgroundColor');
  const color = getStyleString(block.style, 'color');
  const isDarkSection = parentIsDark || isDarkColor(backgroundColor);
  const shouldRepairColor = isDarkSection && (!color || isDarkColor(color));
  const children = block.children?.map((column) =>
    column.map((child) => repairDarkSectionContrast(child, isDarkSection))
  );

  return {
    ...block,
    style: {
      ...block.style,
      ...(shouldRepairColor ? { color: '#f8fafc' } : {}),
    },
    ...(children ? { children } : {}),
  };
};

const isMetricBlock = (block: BlockData) =>
  block.type === 'stats' || block.type === 'progress';

const isTextBlock = (block: BlockData) =>
  block.type === 'text' && (block.id === 'heading' || block.id === 'text');

const repairIntroMetricsTimerSection = (block: BlockData): BlockData => {
  const children = block.children?.map((column) => column.map(repairIntroMetricsTimerSection));
  const nextBlock = children ? { ...block, children } : block;

  if (
    nextBlock.children?.length !== 2 ||
    nextBlock.id === '3-column' ||
    nextBlock.type !== 'column'
  ) {
    return nextBlock;
  }

  const [leftColumn, rightColumn] = nextBlock.children;
  const leftLooksLikeIntro = leftColumn.some(isTextBlock);
  const hasMetrics = rightColumn.some(isMetricBlock);
  const countdownIndex = rightColumn.findIndex((child) => child.type === 'countdown');

  if (!leftLooksLikeIntro || !hasMetrics || countdownIndex === -1) {
    return nextBlock;
  }

  const centerColumn = rightColumn.slice(0, countdownIndex).filter((child) => child.type !== 'countdown');
  const timerColumn = rightColumn.slice(countdownIndex);

  if (centerColumn.length === 0 || timerColumn.length === 0) {
    return nextBlock;
  }

  return {
    ...nextBlock,
    id: '3-column',
    label: '3 Column Layout',
    description: 'Three equal width columns',
    children: [leftColumn, centerColumn, timerColumn],
    style: {
      ...nextBlock.style,
      display: 'flex',
      flexDirection: 'row',
      gap: getStyleString(nextBlock.style, 'gap') || '32px',
      width: getStyleString(nextBlock.style, 'width') || '100%',
      alignItems: getStyleString(nextBlock.style, 'alignItems') || 'flex-start',
    },
  };
};

/** First complete `{ ... }` respecting strings/escapes (avoids slicing at a `}` inside a string). */
const extractBalancedJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

const cleanJsonCandidate = (s: string) =>
  s.replace(/,\s*([\]}])/g, '$1').replace(/(\r\n|\n|\r)/gm, ' ');

const parseModelJson = (content: unknown) => {
  if (isRecord(content)) return content;

  const text = safeString(content).trim();
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  const tryParse = (raw: string) => JSON.parse(cleanJsonCandidate(raw));

  try {
    return tryParse(stripped);
  } catch (err) {
    const balanced = extractBalancedJsonObject(stripped);
    if (balanced) {
      try {
        return tryParse(balanced);
      } catch {
        /* fall through */
      }
    }

    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return tryParse(stripped.slice(start, end + 1));
      } catch (innerErr) {
        throw new Error(
          `Model output did not contain valid JSON: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    throw new Error(
      `Model output did not contain valid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};
type AnalysisElement = {
  blockId?: string;
  column?: number;
  text?: string;
  statsValue?: string;
  statsLabel?: string;
  progressLabel?: string;
  progressPercentage?: number;
  iconName?: string;
  cardData?: Record<string, unknown>;
  color?: string;
  fontSize?: string;
  fontWeight?: string | number;
  styleNotes?: string;
};

type AnalysisSection = {
  order?: number;
  name?: string;
  containerBlockId?: string;
  columnCount?: number;
  backgroundColor?: string;
  padding?: string;
  alignItems?: string;
  justifyContent?: string;
  nav?: Record<string, unknown>;
  elements?: AnalysisElement[];
};

type AnalysisPlan = {
  qualityScore?: number;
  qualityNotes?: string[];
  scope?: string;
  sections: AnalysisSection[];
};

const parseAnalysisPlan = (analysis: unknown): AnalysisPlan => {
  if (!isRecord(analysis)) {
    return { sections: [] };
  }

  const sections = Array.isArray(analysis.sections)
    ? (analysis.sections.filter(isRecord) as AnalysisSection[])
    : [];

  return {
    qualityScore: typeof analysis.qualityScore === 'number' ? analysis.qualityScore : undefined,
    qualityNotes: Array.isArray(analysis.qualityNotes)
      ? analysis.qualityNotes.filter((note): note is string => typeof note === 'string')
      : undefined,
    scope: safeString(analysis.scope),
    sections,
  };
};

const getAnalysisSections = (plan: AnalysisPlan) => plan.sections;

const getAnalysisQualityScore = (analysis: unknown) => {
  const plan = parseAnalysisPlan(analysis);
  return typeof plan.qualityScore === 'number' ? plan.qualityScore : 100;
};

const getAnalysisQualityNotes = (analysis: unknown) => {
  const plan = parseAnalysisPlan(analysis);
  return plan.qualityNotes || [];
};

const elementContent = (element: AnalysisElement, blockIdValue: string) => {
  const text = safeString(element.text);
  if (blockIdValue === 'stats') {
    return JSON.stringify({
      value: element.statsValue || text || '0',
      label: element.statsLabel || '',
    });
  }
  if (blockIdValue === 'progress') {
    return JSON.stringify({
      label: element.progressLabel || text || 'Progress',
      percentage:
        typeof element.progressPercentage === 'number' ? element.progressPercentage : 100,
      barColor: '#22d3ee',
    });
  }
  if (blockIdValue === 'countdown') {
    return JSON.stringify({ days: '0', hours: '00', minutes: '00', seconds: '00' });
  }
  if (blockIdValue === 'icon') {
    return safeString(element.iconName, 'sparkles');
  }
  if (blockIdValue === 'card') {
    const cardData = isRecord(element.cardData)
      ? element.cardData
      : { image: '', eyebrow: '', title: text, body: '', buttonText: '' };
    return JSON.stringify(cardData);
  }
  if (blockIdValue === 'image') {
    return JSON.stringify({ src: '', alt: text || 'Image', caption: '' });
  }
  if (blockIdValue === 'button') {
    return text || 'Click Me';
  }
  return text;
};

const elementStyle = (element: AnalysisElement, section: AnalysisSection, blockIdValue: string) => {
  const dark = isDarkColor(safeString(section.backgroundColor));
  const baseColor = safeString(element.color, dark ? '#f8fafc' : '#111827');
  const fontSize = safeString(element.fontSize, blockIdValue === 'heading' ? '48px' : '18px');
  const fontWeight = element.fontWeight ?? (blockIdValue === 'heading' ? 600 : 400);
  const styleNotes = safeString(element.styleNotes).toLowerCase();

  if (blockIdValue === 'button' && /outline|outlined|ghost|transparent/.test(styleNotes)) {
    return {
      color: baseColor,
      backgroundColor: 'transparent',
      border: `1px solid ${baseColor}`,
      borderRadius: '50px',
      padding: '16px 28px',
      textAlign: 'center' as const,
      fontWeight: 500,
      lineHeight: '1',
    };
  }

  if (blockIdValue === 'button') {
    return {
      color: '#ffffff',
      backgroundColor: '#3b82f6',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 18px',
      textAlign: 'center' as const,
      lineHeight: '1',
    };
  }

  return {
    color: baseColor,
    fontSize,
    fontWeight,
    lineHeight: blockIdValue === 'heading' ? '1' : '1.7',
    textAlign: 'left' as const,
  };
};

const buildElementBlock = (
  element: AnalysisElement,
  section: AnalysisSection
): BlockData | null => {
  const requested = safeString(element.blockId, 'text');
  const blockTypeMap: Record<string, BlockData['type']> = {
    heading: 'text',
    text: 'text',
    button: 'button',
    stats: 'stats',
    progress: 'progress',
    countdown: 'countdown',
    icon: 'icon',
    card: 'card',
    image: 'image',
    'shape-divider': 'shape-divider',
    input: 'input',
    textarea: 'textarea',
    radio: 'radio',
    checkbox: 'checkbox',
    switch: 'switch',
    table: 'table',
    tabs: 'tabs',
    avatar: 'avatar',
    separator: 'separator',
    skeleton: 'skeleton',
  };
  const blockType = blockTypeMap[requested] || 'text';

  const labelMap: Record<string, string> = {
    heading: 'Heading Block',
    text: 'Text Block',
    button: 'Button',
    stats: 'Stats Block',
    progress: 'Progress Bar',
    countdown: 'Countdown Timer',
    icon: 'Icon Block',
    card: 'Card Block',
    image: 'Image Block',
  };

  return {
    uniqueId: crypto.randomUUID(),
    id: requested === 'heading' ? 'heading' : requested,
    label: labelMap[requested] || requested,
    description: safeString(element.styleNotes),
    content: elementContent(element, requested),
    type: blockType,
    style: elementStyle(element, section, requested),
  };
};

const buildNavBarBlock = (section: AnalysisSection): BlockData => {
  const nav = isRecord(section.nav) ? section.nav : {};
  const background = safeString(section.backgroundColor, '#ffffff');
  const dark = isDarkColor(background);
  const defaultLinks = [
    { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
    { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
    { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
  ];

  return {
    uniqueId: crypto.randomUUID(),
    id: 'nav-bar',
    label: 'Nav Bar',
    description: safeString(section.name, 'Navigation bar'),
    content: JSON.stringify({
      logo: safeString(nav.logo, 'Brand'),
      logoType: safeString(nav.logoType, 'text'),
      logoImage: safeString(nav.logoImage),
      layout: safeString(nav.layout, 'horizontal'),
      links: Array.isArray(nav.links) ? nav.links : defaultLinks,
      ctaLabel: safeString(nav.ctaLabel),
      ctaHref: safeString(nav.ctaHref, '#'),
      ctaColor: safeString(nav.ctaColor, '#111827'),
    }),
    type: 'nav-bar',
    style: {
      width: '100%',
      backgroundColor: background,
      color: dark ? '#f8fafc' : '#111827',
      padding: safeString(section.padding, '20px 48px'),
      border: '0px none transparent',
      boxShadow: 'none',
    },
  };
};

const buildSectionBlock = (section: AnalysisSection): BlockData | null => {
  let containerId = safeString(section.containerBlockId, '1-column');
  if (containerId === 'nav-bar') {
    return buildNavBarBlock(section);
  }

  if (!['1-column', '2-column', '3-column'].includes(containerId)) {
    containerId = '1-column';
  }

  const defaultCounts: Record<string, number> = {
    '1-column': 1,
    '2-column': 2,
    '3-column': 3,
  };
  let columnCount =
    typeof section.columnCount === 'number' ? section.columnCount : defaultCounts[containerId];
  columnCount = Math.max(1, Math.min(columnCount, 3));

  const children: BlockData[][] = Array.from({ length: columnCount }, () => []);
  const elements = Array.isArray(section.elements) ? section.elements : [];

  elements.forEach((element, index) => {
    const block = buildElementBlock(element, section);
    if (!block) return;
    const rawColumn = typeof element.column === 'number' ? element.column : index;
    const column = Math.max(0, Math.min(rawColumn, columnCount - 1));
    children[column].push(block);
  });

  const labelMap: Record<string, string> = {
    '1-column': '1 Column Layout',
    '2-column': '2 Column Layout',
    '3-column': '3 Column Layout',
  };

  return {
    uniqueId: crypto.randomUUID(),
    id: containerId,
    label: labelMap[containerId] || 'Column Layout',
    description: safeString(section.name),
    content: '',
    type: 'column',
    children,
    style: {
      padding: safeString(section.padding, '48px 32px'),
      backgroundColor: safeString(section.backgroundColor, 'transparent'),
      display: 'flex',
      flexDirection: columnCount === 1 ? 'column' : 'row',
      gap: '32px',
      width: '100%',
      alignItems: safeString(section.alignItems, 'flex-start'),
      justifyContent: safeString(section.justifyContent, 'flex-start'),
    },
  };
};

const buildComponentsFromAnalysis = (
  analysis: unknown,
  pageType: PageContext
): BlockData[] => {
  const plan = parseAnalysisPlan(analysis);
  const sections = [...plan.sections].sort(
    (a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0)
  );
  const blocks = sections
    .map((section) => buildSectionBlock(section))
    .filter((block): block is BlockData => Boolean(block));
  return enforcePageScope(blocks, pageType);
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

const callKimiApi = async (
  apiKey: string,
  endpoint: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ temperature: 0.05, ...body }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(
      '[Kimi error]',
      response.status,
      JSON.stringify(payload?.error ?? payload, null, 2)
    );
    throw new Error(payload?.error?.message || `Kimi API error ${response.status}`);
  }

  return payload;
};

const callKimiJson = async (
  apiKey: string,
  endpoint: string,
  body: {
    model: string;
    messages: unknown[];
    max_completion_tokens: number;
    temperature?: number;
  }
): Promise<Record<string, unknown>> => {
  const isNvidia = endpoint.includes('nvidia.com') || body.model.includes('kimi-k2.6');
  const normalizedBody: Record<string, any> = { ...body };

  if (isNvidia) {
    normalizedBody.max_tokens = body.max_completion_tokens;
  }

  try {
    return await callKimiApi(apiKey, endpoint, {
      ...normalizedBody,
      response_format: { type: 'json_object' },
    });
  } catch (err) {
    const msg = (err instanceof Error ? err.message : '').toLowerCase();
    if (
      msg.includes('response_format') ||
      msg.includes('failed_generation') ||
      msg.includes('failed to generate') ||
      msg.includes('stop_reason')
    ) {
      console.warn('[Kimi] json_object mode failed - retrying without response_format');
      return await callKimiApi(apiKey, endpoint, normalizedBody);
    }
    throw err;
  }
};

const getGeminiGenerateUrl = (baseUrl: string, model: string, apiKey: string) =>
  `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

const geminiPartFromGroqPart = (part: GroqContentPart) => {
  if (part.type === 'text') {
    return { text: part.text };
  }

  const match = part.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Gemini fallback only supports inline base64 image data.');
  }

  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
};

const callGeminiJson = async (
  apiKey: string,
  baseUrl: string,
  body: {
    model: string;
    content: GroqContentPart[];
    max_completion_tokens: number;
  }
): Promise<Record<string, unknown>> => {
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: body.content.map(geminiPartFromGroqPart),
      },
    ],
    generationConfig: {
      temperature: 0.05,
      maxOutputTokens: body.max_completion_tokens,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(getGeminiGenerateUrl(baseUrl, body.model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('[Gemini error]', response.status, JSON.stringify(payload?.error ?? payload, null, 2));
    throw new Error(payload?.error?.message || `Gemini API error ${response.status}`);
  }

  return payload;
};

const getGroqMessageContent = (payload: Record<string, unknown>) => {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];

  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return '';

  return firstChoice.message.content;
};

const getGeminiMessageContent = (payload: Record<string, unknown>) => {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0];
  if (!isRecord(firstCandidate) || !isRecord(firstCandidate.content)) return '';
  const parts = Array.isArray(firstCandidate.content.parts) ? firstCandidate.content.parts : [];
  return parts
    .map((part) => (isRecord(part) && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
};

const buildAnalysisContent = ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `You are analyzing a webpage screenshot to map it to an editor block system.

${focusInstruction}

${STRICT_ANALYSIS_RULES}

The editor has these block ids:
CONTAINERS (have children): 1-column, 2-column, 3-column, row
STANDALONE STRUCTURAL BLOCKS (no children): nav-bar
LEAF BLOCKS (no children): text, heading, button, icon, card, image, stats, progress, countdown, shape-divider, input, textarea, radio, checkbox, switch, table, tabs, avatar, separator, skeleton

KEY MAPPING RULES:
- A large number with a label below it (e.g. "200+ / Project Delivered") = blockId:"stats", statsValue:"200+", statsLabel:"Project Delivered"
- A horizontal bar with a label and percentage (e.g. "Delivery Rate 100%") = blockId:"progress"
- A timer with days/hours/minutes/seconds = blockId:"countdown"
- A large bold title = blockId:"heading"
- A paragraph of text = blockId:"text"
- A clickable button = blockId:"button"
- Navigation bar with logo and links = standalone blockId:"nav-bar" with content.links
- Three side-by-side columns = containerBlockId:"3-column", columnCount:3
- Two side-by-side columns = containerBlockId:"2-column", columnCount:2
- One full-width column = containerBlockId:"1-column", columnCount:1
- If a button is outlined/ghost/transparent in the screenshot, set styleNotes to describe that outline treatment.

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
      "nav": {
        "logo": "Brand",
        "logoType": "text",
        "logoImage": "",
        "layout": "horizontal",
        "links": [{"label":"Home","href":"#","onClick":"none","onClickValue":""}],
        "ctaLabel": "",
        "ctaHref": "#",
        "ctaColor": "#111827"
      },
      "elements": [
        {
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image|nav-bar|...",
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

const buildReviewContent = ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  visibleAnalysis,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  visibleAnalysis: unknown;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `You are the second-model quality reviewer for a drag-and-drop webpage editor.

Your job is to repair the structured analysis before it becomes user-visible editor JSON.
Do NOT generate final builder blocks. Return only a corrected analysis plan.

${focusInstruction}

${STRICT_ANALYSIS_RULES}

CURRENT ANALYSIS:
${JSON.stringify(visibleAnalysis, null, 2)}

User request: ${prompt || 'Recreate the visible screenshot.'}
${requestedLayoutInstruction ? `Layout requirement: ${requestedLayoutInstruction}` : ''}

Review checklist:
- Keep only sections that are visible or explicitly requested.
- Preserve correct top-to-bottom section order.
- Fix wrong containerBlockId and columnCount by counting visible side-by-side groups.
- Fix every element.column so left/middle/right content lands in the correct column.
- Use nav-bar only for header/navigation, never for normal content sections.
- Use heading/text/button/stats/progress/countdown/icon/card/image/input/textarea/separator/shape-divider block ids only.
- Use stats for number+label groups, progress for labeled bars, countdown for timers.
- On dark sections, choose readable text colors such as #ffffff, #f8fafc, or #cbd5e1.
- Professional output means no unsupported block names, no duplicate sections, no all-content-in-column-0 mistakes, and no unreadable contrast.

Return ONLY this JSON (no markdown):
{
  "qualityScore": 0,
  "qualityNotes": ["short issue or repair note"],
  "scope": "full-page|section|viewport",
  "sections": [
    {
      "order": 1,
      "name": "section name",
      "containerBlockId": "1-column|2-column|3-column|nav-bar",
      "columnCount": 1,
      "backgroundColor": "#ffffff",
      "padding": "48px 32px",
      "alignItems": "flex-start",
      "justifyContent": "flex-start",
      "nav": {
        "logo": "Brand",
        "logoType": "text",
        "logoImage": "",
        "layout": "horizontal",
        "links": [{"label":"Home","href":"#","onClick":"none","onClickValue":""}],
        "ctaLabel": "",
        "ctaHref": "#",
        "ctaColor": "#111827"
      },
      "elements": [
        {
          "blockId": "heading|text|button|stats|progress|countdown|icon|card|image|input|textarea|separator|shape-divider",
          "column": 0,
          "text": "visible text only",
          "statsValue": "200+",
          "statsLabel": "Project Delivered",
          "progressLabel": "Delivery Rate",
          "progressPercentage": 100,
          "iconName": "sparkles",
          "cardData": {"eyebrow":"","title":"","body":"","buttonText":""},
          "color": "#111827",
          "fontSize": "24px",
          "fontWeight": "700",
          "styleNotes": "short style notes"
        }
      ]
    }
  ]
}

Set qualityScore from 0 to 100 after repairs. Use below 80 only if the analysis is too incomplete to produce professional editor JSON.
Keep strings short: qualityNotes entries max 120 characters; section names max 100 characters; element text max 500 characters.`,
  },
];

const buildJsonGenerationContent = ({
  prompt,
  requestedLayoutInstruction,
  visibleAnalysis,
  imageDataUrl,
  focusInstruction,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  visibleAnalysis: unknown;
  imageDataUrl: string;
  focusInstruction: string;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `Convert this analysis into editor builder JSON.

${focusInstruction}

${STRICT_BUILDER_RULES}

ANALYSIS:
${JSON.stringify(visibleAnalysis, null, 2)}

User request: ${prompt || 'Recreate the visible screenshot.'}
${requestedLayoutInstruction ? `Layout requirement: ${requestedLayoutInstruction}` : ''}

STEP BY STEP:
1. For each section in analysis.sections (in order), create one top-level block.
   - Use section.containerBlockId as the block id.
   - Set type based on catalog: nav-bar->nav-bar, 1-column/2-column/3-column->column.
2. If section.containerBlockId is "nav-bar", create a nav-bar block with NO children. Put logo, layout, links, and CTA in content.
3. For column containers, set children as an array of exactly section.columnCount sub-arrays: [[], [], ...].
4. Place each element into children[element.column] as a leaf block.
5. For STATS blocks: content = JSON.stringify({"value": element.statsValue, "label": element.statsLabel})
6. For PROGRESS blocks: content = JSON.stringify({"label": element.progressLabel, "percentage": element.progressPercentage})
7. For COUNTDOWN blocks: content = JSON.stringify({"days":"0","hours":"00","minutes":"00","seconds":"00"})
8. For HEADING blocks: id="heading", type="text", content = element.text
9. For TEXT blocks: id="text", type="text", content = element.text
10. For ICON blocks: content = element.iconName
11. For CARD blocks: content = JSON.stringify(element.cardData)
12. Set container style.backgroundColor from section.backgroundColor.
13. Set container style: display:"flex", flexDirection:"row" (for 2-col and 3-col), gap:"32px", padding: section.padding or "48px 32px", width:"100%", alignItems:"flex-start".
14. Set 1-column container style: display:"flex", flexDirection:"column".
15. Set element text color from element.color. Set fontSize from element.fontSize. Set fontWeight from element.fontWeight.

VALIDATION (check before returning):
- Every 2-column block must have children with EXACTLY 2 arrays.
- Every 3-column block must have children with EXACTLY 3 arrays.
- NEVER place all elements into children[0] — distribute them across column arrays by their element.column value.
- A 3-column block with children: [[a,b,c,d,e],[],[]] is WRONG. Distribute correctly.
- If the source has left content, center metrics/progress, and right timer/text, a 2-column output is WRONG. Use 3-column.
- For sections with columnCount > 1, the container MUST have style.display="flex" and style.flexDirection="row".
- On dark backgrounds, body text must be readable (#ffffff, #f8fafc, or #cbd5e1). Do not use near-black text on dark backgrounds.
- If a button is visibly transparent with only an outline, style it with transparent background, border, and matching text color. Do not make it filled blue.

Return ONLY: {"components":[...]}
No markdown. No explanation.`,
  },
  ...(imageDataUrl
    ? [{ type: 'image_url' as const, image_url: { url: imageDataUrl } }]
    : []),
];

void buildJsonGenerationContent;

const reviewAnalysisWithSecondModel = async ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  visibleAnalysis,
  config,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  visibleAnalysis: unknown;
  config: AiRuntimeConfig;
}) => {
  const reviewers: AnalysisProvider[] = ['openrouter'];
  const errors: string[] = [];

  for (const provider of reviewers) {
    const apiKey = provider === 'openrouter' ? getOpenRouterApiKey(config) : '';
    if (!apiKey) continue;

    try {
      const content = buildReviewContent({
        prompt,
        requestedLayoutInstruction,
        focusInstruction,
        visibleAnalysis,
      });

      let reviewPayload: Record<string, unknown> | null = null;
      let lastReviewError: string | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        const maxTokens = attempt === 0 ? 8192 : 16384;
        if (attempt > 0) {
          console.warn('[AI] Review parse failed or empty sections; retrying with higher max_completion_tokens');
        }

        reviewPayload = await callOpenRouterJson(apiKey, {
          model: config.openrouterReviewModel,
          messages: [{ role: 'user', content }],
          max_completion_tokens: maxTokens,
        });

        try {
          const reviewedAnalysis = parseModelJson(getGroqMessageContent(reviewPayload));
          const reviewedSections = getAnalysisSections(parseAnalysisPlan(reviewedAnalysis));

          if (reviewedSections.length > 0) {
            return { reviewedAnalysis, reviewPayload, reviewerProvider: provider };
          }
          lastReviewError = `${provider} review returned no sections`;
        } catch (parseErr) {
          lastReviewError = parseErr instanceof Error ? parseErr.message : String(parseErr);
        }
      }

      errors.push(lastReviewError || `${provider} review failed`);
    } catch (err) {
      errors.push(`${provider} review failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  throw new Error(`All review attempts failed: ${errors.join(' | ')}`);
};

const runAnalysisProvider = async ({
  provider,
  apiKey,
  content,
  hasImage,
  config,
}: {
  provider: AnalysisProvider;
  apiKey: string;
  content: GroqContentPart[];
  hasImage: boolean;
  config: AiRuntimeConfig;
}) => {
  if (provider === 'openrouter') {
    const model = config.openrouterModel;
    const payload = await callOpenRouterJson(apiKey, {
      model,
      messages: [{ role: 'user', content }],
      max_completion_tokens: 8192,
    });
    return {
      payload,
      model,
      analysis: parseModelJson(getGroqMessageContent(payload)),
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
};

const generateReviewedAnalysisWithFallback = async ({
  content,
  hasImage,
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  config,
}: {
  content: GroqContentPart[];
  hasImage: boolean;
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  config: AiRuntimeConfig;
}) => {
  const providers: AnalysisProvider[] = ['openrouter'];
  const errors: string[] = [];

  for (const provider of providers) {
    const apiKey = provider === 'openrouter' ? getOpenRouterApiKey(config) : '';
    if (!apiKey) continue;

    try {
        console.log(`[AI] Attempting ${provider}...`);
        const analysisAttempt = await runAnalysisProvider({
          provider,
          apiKey,
          content,
          hasImage,
          config,
        });

        const { reviewedAnalysis, reviewPayload, reviewerProvider } =
          await reviewAnalysisWithSecondModel({
            prompt,
            requestedLayoutInstruction,
            focusInstruction,
            visibleAnalysis: analysisAttempt.analysis,
            config,
          });

        const qualityScore = getAnalysisQualityScore(reviewedAnalysis);

        if (qualityScore >= config.minQualityScore) {
          return {
            provider,
            model: analysisAttempt.model,
            payload: analysisAttempt.payload,
            reviewedAnalysis,
            reviewPayload,
            qualityScore,
            reviewerProvider: reviewerProvider,
          };
        }

        errors.push(`${provider} quality score ${qualityScore} too low`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${provider} failed: ${msg}`);

      if (msg.toLowerCase().includes('429')) {
        console.warn(`[AI] Rate limit hit. Sleeping for 10s...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }
  }

  throw new Error(`No provider produced professional output. ${errors.join(' | ')}`);
};

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const aiConfig = await getAiRuntimeConfig();

  if (!getOpenRouterApiKey(aiConfig)) {
    return NextResponse.json(
      {
        message:
          'Missing OpenRouter API key. Add it in Dashboard > AI Settings or set OPENROUTER_API_KEY in .env.',
      },
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

    const analysisContentParts = buildAnalysisContent({
      prompt,
      requestedLayoutInstruction,
      focusInstruction,
    });

    const analysisContent = hasImage
      ? [...analysisContentParts, { type: 'image_url' as const, image_url: { url: imageDataUrl } }]
      : analysisContentParts;
    const analysisResult = await generateReviewedAnalysisWithFallback({
      content: analysisContent,
      hasImage,
      prompt,
      requestedLayoutInstruction,
      focusInstruction,
      config: aiConfig,
    });
    const visibleAnalysis = analysisResult.reviewedAnalysis;
    const reviewPayload = analysisResult.reviewPayload;
    const qualityScore = getAnalysisQualityScore(visibleAnalysis);

    if (qualityScore < aiConfig.minQualityScore) {
      return NextResponse.json(
        {
          message:
            'The AI result did not pass the quality check. Try a clearer prompt or a higher-resolution image.',
          qualityScore,
          qualityNotes: getAnalysisQualityNotes(visibleAnalysis),
        },
        { status: 422 }
      );
    }

    const components = buildComponentsFromAnalysis(visibleAnalysis, pageType)
      .map((block) => sanitizeBlock(block, 0, { count: 0 }))
      .filter((block): block is BlockData => Boolean(block))
      .map(enforceColumnCounts)
      .map(flattenSingleChildColumns)
      .map(ensureFlexOnMultiColumnContainers)
      .map(repairIntroMetricsTimerSection)
      .map((block) => repairDarkSectionContrast(block));

    const layoutAdjustedComponents = applyRequestedLayout(
      components.map(applyEditorBlockDefaults),
      requestedLayout
    ).map(applyEditorBlockDefaults);

    if (layoutAdjustedComponents.length === 0) {
      return NextResponse.json(
        { message: 'AI returned JSON, but no valid builder components were found.' },
        { status: 422 }
      );
    }

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
          });
          const focusedResult = await generateReviewedAnalysisWithFallback({
            content: [
              ...focusedAnalysisParts,
              { type: 'image_url' as const, image_url: { url: imageDataUrl } },
            ],
            hasImage: true,
            prompt: `Extract ONLY the ${focus} of the image.`,
            requestedLayoutInstruction: '',
            focusInstruction: instruction,
            config: aiConfig,
          });
          const focusedAnalysis = focusedResult.reviewedAnalysis;

          if (getAnalysisQualityScore(focusedAnalysis) < aiConfig.minQualityScore) {
            return undefined;
          }

          const focusedComponents = buildComponentsFromAnalysis(focusedAnalysis, focus)
            .map((block) => sanitizeBlock(block, 0, { count: 0 }))
            .filter((block): block is BlockData => Boolean(block))
            .map(enforceColumnCounts)
            .map(flattenSingleChildColumns)
            .map(ensureFlexOnMultiColumnContainers)
            .map(repairIntroMetricsTimerSection)
            .map((block) => repairDarkSectionContrast(block))
            .map(applyEditorBlockDefaults);
          const scopedComponents = enforcePageScope(focusedComponents, focus);
          return scopedComponents.length > 0 ? scopedComponents : undefined;
        } catch (err) {
          console.warn(`[AI] focused ${focus} extraction failed:`, err);
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
      components: layoutAdjustedComponents,
      headerComponents,
      footerComponents,
      analysis: visibleAnalysis,
      requestedLayout,
      pageType,
      provider: analysisResult.provider,
      model: analysisResult.model,
      reviewModel: aiConfig.openrouterReviewModel,
      reviewProvider: (analysisResult as { reviewerProvider?: string }).reviewerProvider || 'openrouter',
      qualityScore,
      qualityNotes: getAnalysisQualityNotes(visibleAnalysis),
      usage: {
        analysis: analysisResult.payload?.usage,
        review: reviewPayload?.usage,
      },
    });
  } catch (error) {
    console.error('AI page JSON generation failed:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}

const callOpenRouterApi = async (
  apiKey: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  console.log(`[DEBUG] Calling OpenRouter. Model: ${body.model}`);
  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/open-next/nextcmsmains',
      'X-Title': 'NextCMS',
    },
    body: JSON.stringify({ temperature: 0.05, ...body }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(
      '[OpenRouter error]',
      response.status,
      JSON.stringify(payload?.error ?? payload, null, 2)
    );
    throw new Error(payload?.error?.message || `OpenRouter API error ${response.status}`);
  }

  return payload;
};

const callOpenRouterJson = async (
  apiKey: string,
  body: {
    model: string;
    messages: unknown[];
    max_completion_tokens: number;
    temperature?: number;
  }
): Promise<Record<string, unknown>> => {
  try {
    return await callOpenRouterApi(apiKey, {
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
      console.warn('[OpenRouter] json_object mode failed — retrying without response_format');
      return await callOpenRouterApi(apiKey, { ...body });
    }
    throw err;
  }
};
