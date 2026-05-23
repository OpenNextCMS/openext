import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import type { CSSProperties } from 'react';
import type { BlockData } from '@/types';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import {
  getPageDbConnection,
  getPageModel,
  getSettingsModel,
  getUserDbConnection,
} from '@/utils/db';
import {
  aiEditorBlocksById,
  aiEditorBlocksByType,
  aiEditorBlockTypes,
  type AiEditorBlock,
} from './block-catalog';
import { enrichComponentsWithImages, inferIndustryTags } from './fetch-images';

export const runtime = 'nodejs';

const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BLOCKS = 120;
const MAX_DEPTH = 7;
const DEFAULT_IMAGE_RECREATE_PROMPT =
  'Recreate the uploaded image as closely as possible as a webpage in the editor. Match the visible layout, sections, colors, spacing, typography, buttons, cards, icons, and readable text using only editor blocks.';

type PageContext = 'page' | 'header' | 'footer';
type AnalysisProvider = 'openrouter';

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
      } catch {
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
type PageTheme = {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  buttonStyle?: string;
  borderRadius?: string;
};

type SemanticBlock = {
  id?: string;
  type?: string;
  customType?: string;
  order?: number;
  content?: Record<string, unknown>;
  images?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

type PageSpec = {
  title?: string;
  description?: string;
  theme?: PageTheme;
  blocks: SemanticBlock[];
};

type PagePlan = {
  qualityScore?: number;
  qualityNotes?: string[];
  page: PageSpec;
};

const parsePagePlan = (data: unknown): PagePlan => {
  if (!isRecord(data)) return { page: { blocks: [] } };

  const pageField = isRecord(data.page) ? data.page : data;
  const blocks = Array.isArray(pageField.blocks)
    ? (pageField.blocks.filter(isRecord) as SemanticBlock[])
    : [];

  const theme = isRecord(pageField.theme) ? (pageField.theme as PageTheme) : undefined;

  return {
    qualityScore: typeof data.qualityScore === 'number' ? data.qualityScore : undefined,
    qualityNotes: Array.isArray(data.qualityNotes)
      ? data.qualityNotes.filter((n): n is string => typeof n === 'string')
      : undefined,
    page: {
      title: safeString(pageField.title),
      description: safeString(pageField.description),
      theme,
      blocks,
    },
  };
};

const getPageBlocks = (plan: PagePlan) => plan.page.blocks;

const getPageQualityScore = (data: unknown) => {
  const plan = parsePagePlan(data);
  return typeof plan.qualityScore === 'number' ? plan.qualityScore : 100;
};

const getPageQualityNotes = (data: unknown) => parsePagePlan(data).qualityNotes || [];

const pickString = (rec: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

const pickArray = (rec: Record<string, unknown>, ...keys: string[]): unknown[] => {
  for (const k of keys) {
    const v = rec[k];
    if (Array.isArray(v)) return v;
  }
  return [];
};

const themeAccent = (theme?: PageTheme) => safeString(theme?.primaryColor, '#3b82f6');
const themeSurface = (theme?: PageTheme) => safeString(theme?.backgroundColor, '#ffffff');
const themeText = (theme?: PageTheme) =>
  safeString(theme?.textColor, isDarkColor(themeSurface(theme)) ? '#f8fafc' : '#111827');
const themeMuted = (theme?: PageTheme) =>
  isDarkColor(themeSurface(theme)) ? '#cbd5e1' : '#6b7280';
const themeRadius = (theme?: PageTheme) => safeString(theme?.borderRadius, '10px');
const themeFont = (theme?: PageTheme) =>
  safeString(theme?.fontFamily, 'Inter, system-ui, sans-serif');

const newId = () => crypto.randomUUID();

const textBlock = (
  content: string,
  style: CSSProperties = {},
  isHeading = false
): BlockData => ({
  uniqueId: newId(),
  id: isHeading ? 'heading' : 'text',
  label: isHeading ? 'Heading Block' : 'Text Block',
  content,
  type: 'text',
  style,
});

const buttonBlock = (
  text: string,
  variant: 'primary' | 'secondary',
  theme?: PageTheme
): BlockData => {
  const radius = themeRadius(theme);
  const accent = themeAccent(theme);
  const font = themeFont(theme);

  const baseStyle: CSSProperties = {
    borderRadius: radius,
    padding: '12px 28px',
    textAlign: 'center',
    fontFamily: font,
    fontWeight: 600,
    fontSize: '15px',
    lineHeight: '1.4',
    cursor: 'pointer',
  };

  const style =
    variant === 'primary'
      ? {
          ...baseStyle,
          color: '#ffffff',
          backgroundColor: accent,
          border: 'none',
        }
      : {
          ...baseStyle,
          color: themeText(theme),
          backgroundColor: 'transparent',
          border: `1px solid ${themeText(theme)}`,
        };

  return {
    uniqueId: newId(),
    id: 'button',
    label: 'Button',
    content: text,
    type: 'button',
    style,
  };
};

const imageBlock = (src: string, alt: string, style: CSSProperties = {}): BlockData => ({
  uniqueId: newId(),
  id: 'image',
  label: 'Image Block',
  content: JSON.stringify({ src, alt, caption: '' }),
  type: 'image',
  style: { width: '100%', borderRadius: '12px', objectFit: 'cover', ...style },
});

const cardBlock = (
  data: { eyebrow?: string; title?: string; body?: string; buttonText?: string; image?: string },
  theme?: PageTheme
): BlockData => ({
  uniqueId: newId(),
  id: 'card',
  label: 'Card Block',
  content: JSON.stringify({
    eyebrow: data.eyebrow || '',
    title: data.title || '',
    body: data.body || '',
    buttonText: data.buttonText || '',
    image: data.image || '',
  }),
  type: 'card',
  style: {
    padding: '24px',
    borderRadius: themeRadius(theme),
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
});

const statsBlock = (value: string, label: string, theme?: PageTheme): BlockData => ({
  uniqueId: newId(),
  id: 'stats',
  label: 'Stats Block',
  content: JSON.stringify({ value, label }),
  type: 'stats',
  style: {
    textAlign: 'center',
    color: themeText(theme),
    fontFamily: themeFont(theme),
  },
});

const iconBlock = (icon: string, color = '#3b82f6'): BlockData => ({
  uniqueId: newId(),
  id: 'icon',
  label: 'Icon Block',
  content: icon || 'sparkles',
  icon: icon || 'sparkles',
  type: 'icon',
  style: { color, fontSize: '32px' },
});

const inputBlock = (placeholder: string, label = ''): BlockData => ({
  uniqueId: newId(),
  id: 'input',
  label: 'Input Box',
  content: JSON.stringify({ label, placeholder, value: '' }),
  type: 'input',
  style: {},
});

const textareaBlock = (placeholder: string, label = 'Message'): BlockData => ({
  uniqueId: newId(),
  id: 'textarea',
  label: 'Textarea',
  content: JSON.stringify({ label, placeholder, value: '' }),
  type: 'textarea',
  style: {},
});

const separatorBlock = (): BlockData => ({
  uniqueId: newId(),
  id: 'separator',
  label: 'Separator',
  content: '',
  type: 'separator',
  style: { width: '100%', height: '1px', backgroundColor: '#e5e7eb', margin: '24px 0' },
});

const rowOf = (children: BlockData[], style: CSSProperties = {}): BlockData => ({
  uniqueId: newId(),
  id: 'row',
  label: 'Row Layout',
  content: '',
  type: 'row',
  children: [children],
  style: {
    display: 'flex',
    flexDirection: 'row',
    gap: '16px',
    flexWrap: 'wrap',
    ...style,
  },
});

const columnContainer = (
  cols: 1 | 2 | 3,
  children: BlockData[][],
  style: CSSProperties = {},
  description = ''
): BlockData => {
  const normalized: BlockData[][] = Array.from({ length: cols }, (_, i) => children[i] || []);
  return {
    uniqueId: newId(),
    id: `${cols}-column`,
    label: `${cols} Column Layout`,
    description,
    content: '',
    type: 'column',
    children: normalized,
    style: {
      padding: '80px 32px',
      display: 'flex',
      flexDirection: cols === 1 ? 'column' : 'row',
      gap: '32px',
      width: '100%',
      alignItems: 'flex-start',
      ...style,
    },
  };
};

const sectionPadding = '80px 32px';
const heroPadding = '112px 64px';

const headingStyle = (theme?: PageTheme): CSSProperties => ({
  color: themeText(theme),
  fontFamily: themeFont(theme),
  fontSize: '40px',
  fontWeight: 700,
  lineHeight: '1.15',
  letterSpacing: '-0.02em',
  margin: '0 0 16px 0',
});

const bodyTextStyle = (theme?: PageTheme): CSSProperties => ({
  color: themeMuted(theme),
  fontFamily: themeFont(theme),
  fontSize: '17px',
  lineHeight: '1.6',
  margin: '0 0 8px 0',
});

const eyebrowStyle = (theme?: PageTheme): CSSProperties => ({
  color: themeAccent(theme),
  fontFamily: themeFont(theme),
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 12px 0',
});

const sectionHeaderColumn = (
  eyebrow: string,
  heading: string,
  description: string,
  theme?: PageTheme,
  align: 'left' | 'center' = 'left'
): BlockData[] => {
  const out: BlockData[] = [];
  const baseAlign = { textAlign: align };
  if (eyebrow) out.push(textBlock(eyebrow, { ...eyebrowStyle(theme), ...baseAlign }));
  if (heading) out.push(textBlock(heading, { ...headingStyle(theme), ...baseAlign }, true));
  if (description) out.push(textBlock(description, { ...bodyTextStyle(theme), ...baseAlign }));
  return out;
};

const translateNavbar = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const links = pickArray(content, 'links', 'menu', 'items').map((l) => {
    const link = isRecord(l) ? l : {};
    return {
      label: pickString(link, 'label', 'name', 'title', 'text') || 'Link',
      href: pickString(link, 'href', 'url', 'link') || '#',
      onClick: 'none',
      onClickValue: '',
    };
  });

  const finalLinks = links.length
    ? links
    : [
        { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
      ];

  const cta = isRecord(content.cta) ? content.cta : null;
  const ctaLabel = cta
    ? pickString(cta, 'label', 'text', 'name')
    : pickString(content, 'ctaLabel', 'buttonText', 'button');
  const ctaHref = cta
    ? pickString(cta, 'href', 'url') || '#'
    : pickString(content, 'ctaHref', 'buttonHref') || '#';

  const bg = themeSurface(theme);
  return {
    uniqueId: newId(),
    id: 'nav-bar',
    label: 'Nav Bar',
    description: 'Navigation bar',
    content: JSON.stringify({
      logo: pickString(content, 'logo', 'brand', 'logoText', 'siteName') || 'Brand',
      logoType: 'text',
      logoImage: '',
      layout: 'horizontal',
      links: finalLinks,
      ctaLabel,
      ctaHref,
      ctaColor: themeAccent(theme),
    }),
    type: 'nav-bar',
    style: {
      width: '100%',
      backgroundColor: bg,
      color: themeText(theme),
      padding: '20px 48px',
      fontFamily: themeFont(theme),
    },
  };
};

const translateHero = (
  block: SemanticBlock,
  theme: PageTheme | undefined,
  variant: 'default' | 'split' | 'centered'
): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const images = isRecord(block.images) ? block.images : {};

  const eyebrow = pickString(content, 'eyebrow', 'tag', 'pretitle', 'kicker');
  const headline = pickString(content, 'headline', 'title', 'heading', 'mainText');
  const subheadline = pickString(content, 'subheadline', 'subtitle', 'description', 'subtext');
  const primaryBtn = pickString(content, 'primaryButton', 'primaryCta', 'cta', 'buttonText');
  const secondaryBtn = pickString(content, 'secondaryButton', 'secondaryCta', 'secondaryButtonText');
  const heroImage = pickString(images, 'heroImage', 'image', 'main', 'background', 'src');

  const align: 'left' | 'center' = variant === 'centered' ? 'center' : 'left';
  const textColumn: BlockData[] = sectionHeaderColumn(eyebrow, headline, subheadline, theme, align);

  if (subheadline) {
    const last = textColumn[textColumn.length - 1];
    last.style = { ...last.style, fontSize: '20px', margin: '0 0 28px 0', maxWidth: '560px' };
  }
  if (headline) {
    const headingNode = textColumn.find((b) => b.id === 'heading');
    if (headingNode) {
      headingNode.style = { ...headingNode.style, fontSize: '56px', letterSpacing: '-0.025em' };
    }
  }

  const buttons: BlockData[] = [];
  if (primaryBtn) buttons.push(buttonBlock(primaryBtn, 'primary', theme));
  if (secondaryBtn) buttons.push(buttonBlock(secondaryBtn, 'secondary', theme));
  if (buttons.length) {
    textColumn.push(
      rowOf(buttons, {
        gap: '16px',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
      })
    );
  }

  const sectionStyle: CSSProperties = {
    padding: heroPadding,
    backgroundColor: themeSurface(theme),
    alignItems: align === 'center' ? 'center' : 'center',
    textAlign: align,
    fontFamily: themeFont(theme),
  };

  const heroAlt = headline || 'Hero image';

  if (variant === 'split') {
    return columnContainer(
      2,
      [textColumn, [imageBlock(heroImage, heroAlt)]],
      { ...sectionStyle, gap: '64px' },
      'Hero (split)'
    );
  }

  if (variant !== 'centered') {
    textColumn.push(imageBlock(heroImage, heroAlt, { marginTop: '32px' }));
  }

  return columnContainer(1, [textColumn], sectionStyle, variant === 'centered' ? 'Hero (centered)' : 'Hero');
};

const cardListFromContent = (block: SemanticBlock) => {
  const content = isRecord(block.content) ? block.content : {};
  const items = pickArray(content, 'items', 'services', 'features', 'cards', 'list').map(
    (it) => (isRecord(it) ? it : ({} as Record<string, unknown>))
  );
  const heading = pickString(content, 'title', 'heading', 'headline');
  const subtitle = pickString(content, 'subtitle', 'description', 'subheading');
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  return { items, heading, subtitle, eyebrow };
};

const translateCardGrid = (
  block: SemanticBlock,
  theme: PageTheme | undefined,
  imageKey = 'image',
  defaultCols: 1 | 2 | 3 = 3
): BlockData => {
  const { items, heading, subtitle, eyebrow } = cardListFromContent(block);
  const images = isRecord(block.images) ? block.images : {};
  const description = block.type || 'Card grid';
  const cols = (items.length === 2 ? 2 : items.length === 1 ? 1 : defaultCols) as 1 | 2 | 3;

  const cards: BlockData[] = items.map((item, idx) => {
    const itemImage =
      pickString(item, imageKey, 'image', 'src', 'thumbnail') ||
      pickString(images, `${imageKey}${idx + 1}`, `image${idx + 1}`);
    return cardBlock(
      {
        eyebrow: pickString(item, 'eyebrow', 'tag', 'category'),
        title: pickString(item, 'title', 'name', 'heading'),
        body: pickString(item, 'description', 'body', 'text', 'summary'),
        buttonText: pickString(item, 'buttonText', 'cta', 'linkText'),
        image: itemImage,
      },
      theme
    );
  });

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cards.forEach((card, i) => gridChildren[i % cols].push(card));

  if (!headerCol.length) {
    return columnContainer(
      cols,
      gridChildren,
      { padding: sectionPadding, backgroundColor: themeSurface(theme), fontFamily: themeFont(theme) },
      description
    );
  }

  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '24px' }, 'Cards');
  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    description
  );
};

const translateFeatureGrid = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const { items, heading, subtitle, eyebrow } = cardListFromContent(block);
  const cols: 1 | 2 | 3 = items.length === 2 ? 2 : items.length === 1 ? 1 : 3;

  const featureBlocks: BlockData[] = items.map((item) => {
    const cell: BlockData[] = [];
    const icon = pickString(item, 'icon', 'lucideIcon');
    if (icon) cell.push(iconBlock(icon, themeAccent(theme)));
    const title = pickString(item, 'title', 'name', 'heading');
    const desc = pickString(item, 'description', 'body', 'text');
    if (title)
      cell.push(
        textBlock(
          title,
          { ...headingStyle(theme), fontSize: '20px', margin: '12px 0 8px 0' },
          true
        )
      );
    if (desc) cell.push(textBlock(desc, bodyTextStyle(theme)));
    return columnContainer(1, [cell], { padding: '0', gap: '8px' }, 'Feature');
  });

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  featureBlocks.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '32px' }, 'Feature grid');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Features'
  );
};

const translateAbout = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const images = isRecord(block.images) ? block.images : {};
  const heading = pickString(content, 'title', 'heading', 'headline');
  const body = pickString(content, 'description', 'body', 'text');
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  const aboutImage = pickString(images, 'aboutImage', 'image', 'src');

  const left = sectionHeaderColumn(eyebrow, heading, body, theme, 'left');

  return columnContainer(
    2,
    [left, [imageBlock(aboutImage, heading || 'About image')]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      gap: '64px',
      fontFamily: themeFont(theme),
    },
    'About'
  );
};

const translateStats = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const items = pickArray(content, 'items', 'stats', 'metrics').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );
  const heading = pickString(content, 'title', 'heading');
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  const subtitle = pickString(content, 'subtitle', 'description');

  const cols: 1 | 2 | 3 = items.length >= 3 ? 3 : items.length === 2 ? 2 : 1;
  const cells: BlockData[] = items.map((item) =>
    statsBlock(
      pickString(item, 'value', 'number', 'count') || '0',
      pickString(item, 'label', 'name', 'title') || '',
      theme
    )
  );
  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cells.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '24px' }, 'Stats grid');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: isDarkColor(themeSurface(theme)) ? themeSurface(theme) : '#0f172a',
      color: '#f8fafc',
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Stats'
  );
};

const translateCta = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const heading = pickString(content, 'title', 'heading', 'headline');
  const subtitle = pickString(content, 'subtitle', 'description', 'subheading');
  const primaryBtn = pickString(content, 'primaryButton', 'buttonText', 'cta');
  const secondaryBtn = pickString(content, 'secondaryButton', 'secondaryButtonText');

  const col: BlockData[] = sectionHeaderColumn('', heading, subtitle, theme, 'center');
  col.forEach((b) => {
    if (b.id === 'heading') b.style = { ...b.style, color: '#ffffff', fontSize: '40px' };
    else b.style = { ...b.style, color: '#e2e8f0' };
  });

  const buttons: BlockData[] = [];
  if (primaryBtn) buttons.push(buttonBlock(primaryBtn, 'primary', theme));
  if (secondaryBtn) {
    const btn = buttonBlock(secondaryBtn, 'secondary', theme);
    btn.style = { ...btn.style, color: '#ffffff', border: '1px solid #ffffff' };
    buttons.push(btn);
  }
  if (buttons.length) col.push(rowOf(buttons, { gap: '16px', justifyContent: 'center' }));

  const accent = themeAccent(theme);
  return columnContainer(
    1,
    [col],
    {
      padding: '96px 32px',
      backgroundImage: `linear-gradient(135deg, ${accent} 0%, ${themeAccent({
        ...theme,
        primaryColor: theme?.secondaryColor || accent,
      })} 100%)`,
      backgroundColor: accent,
      alignItems: 'center',
      textAlign: 'center',
      fontFamily: themeFont(theme),
    },
    'CTA'
  );
};

const translateTestimonials = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const items = pickArray(content, 'items', 'testimonials', 'quotes').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );
  const heading = pickString(content, 'title', 'heading') || 'What our clients say';
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  const subtitle = pickString(content, 'subtitle', 'description');

  const cols: 1 | 2 | 3 = items.length >= 3 ? 3 : items.length === 2 ? 2 : 1;
  const cards: BlockData[] = items.map((item) =>
    cardBlock(
      {
        eyebrow: pickString(item, 'role', 'position', 'title'),
        title: pickString(item, 'name', 'author') || 'Customer',
        body: pickString(item, 'feedback', 'quote', 'text', 'body'),
        image: pickString(item, 'avatar', 'image', 'photo'),
      },
      theme
    )
  );

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cards.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '24px' }, 'Testimonials');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Testimonials'
  );
};

const translateTeam = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const members = pickArray(content, 'items', 'members', 'team', 'people').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );
  const cols: 1 | 2 | 3 = members.length >= 3 ? 3 : members.length === 2 ? 2 : 1;
  const heading = pickString(content, 'title', 'heading') || 'Meet the team';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');

  const cells: BlockData[] = members.map((m) => {
    const cell: BlockData[] = [];
    const avatar = pickString(m, 'avatar', 'photo', 'image', 'src');
    const memberName = pickString(m, 'name', 'title');
    // Round image block renders reliably at portrait size; the Radix Avatar
    // component is too small (40x40) for team-section thumbnails.
    cell.push(
      imageBlock(avatar, memberName || 'Team member portrait', {
        width: '140px',
        height: '140px',
        borderRadius: '50%',
        objectFit: 'cover',
        margin: '0 auto 12px',
      })
    );
    const role = pickString(m, 'role', 'position', 'title');
    if (memberName)
      cell.push(
        textBlock(
          memberName,
          { ...headingStyle(theme), fontSize: '18px', margin: '12px 0 4px 0', textAlign: 'center' },
          true
        )
      );
    if (role)
      cell.push(
        textBlock(role, {
          ...bodyTextStyle(theme),
          fontSize: '14px',
          color: themeAccent(theme),
          textAlign: 'center',
        })
      );
    return columnContainer(1, [cell], { padding: '0', alignItems: 'center', gap: '4px' }, 'Member');
  });

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cells.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '32px' }, 'Team grid');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Team'
  );
};

const translatePricing = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const plans = pickArray(content, 'plans', 'tiers', 'items', 'packages').map((p) =>
    isRecord(p) ? p : ({} as Record<string, unknown>)
  );
  const cols: 1 | 2 | 3 = plans.length >= 3 ? 3 : plans.length === 2 ? 2 : 1;
  const heading = pickString(content, 'title', 'heading') || 'Simple pricing';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');

  const cards: BlockData[] = plans.map((plan) => {
    const features = pickArray(plan, 'features', 'items', 'perks');
    const featureList = features
      .map((f) => (typeof f === 'string' ? f : pickString(isRecord(f) ? f : {}, 'label', 'title')))
      .filter(Boolean);
    const period = pickString(plan, 'period', 'interval');
    const price = pickString(plan, 'price', 'cost', 'amount');
    return cardBlock(
      {
        eyebrow: pickString(plan, 'name', 'title') || 'Plan',
        title: period ? `${price}/${period}` : price,
        body: featureList.join(' • '),
        buttonText: pickString(plan, 'buttonText', 'cta', 'ctaLabel') || 'Choose',
      },
      theme
    );
  });

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cards.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '24px' }, 'Pricing grid');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Pricing'
  );
};

const translateGalleryOrPortfolio = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const images = isRecord(block.images) ? block.images : {};
  const items = pickArray(content, 'items', 'images', 'projects', 'works').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );

  const tiles: BlockData[] = items.length
    ? items.map((item) => {
        const src = pickString(item, 'image', 'src', 'thumbnail');
        const alt = pickString(item, 'title', 'name', 'alt') || 'Gallery image';
        if (!src) return cardBlock({ title: alt, body: pickString(item, 'description', 'body') }, theme);
        return imageBlock(src, alt);
      })
    : Object.values(images)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .map((src) => imageBlock(src, 'Gallery image'));

  if (tiles.length === 0) tiles.push(imageBlock('', 'Gallery image'));

  const heading = pickString(content, 'title', 'heading') || 'Our work';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');

  const cols: 1 | 2 | 3 = tiles.length >= 3 ? 3 : tiles.length === 2 ? 2 : 1;
  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  tiles.forEach((t, i) => gridChildren[i % cols].push(t));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '16px' }, 'Gallery');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    block.type === 'portfolio' ? 'Portfolio' : 'Gallery'
  );
};

const translateFaq = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const items = pickArray(content, 'items', 'questions', 'faqs').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );
  const heading = pickString(content, 'title', 'heading') || 'Frequently asked questions';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');

  const rows: BlockData[] = [];
  items.forEach((item, idx) => {
    const q = pickString(item, 'question', 'q', 'title');
    const a = pickString(item, 'answer', 'a', 'body', 'description');
    if (q)
      rows.push(
        textBlock(
          q,
          { ...headingStyle(theme), fontSize: '20px', margin: '24px 0 8px 0' },
          true
        )
      );
    if (a) rows.push(textBlock(a, bodyTextStyle(theme)));
    if (idx < items.length - 1) rows.push(separatorBlock());
  });

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'left');

  return columnContainer(
    1,
    [[...headerCol, ...rows]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: themeFont(theme),
    },
    'FAQ'
  );
};

const translateBlog = (block: SemanticBlock, theme?: PageTheme): BlockData =>
  translateCardGrid(block, theme, 'image', 3);

const translateContact = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const heading = pickString(content, 'title', 'heading') || 'Get in touch';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  const email = pickString(content, 'email');
  const phone = pickString(content, 'phone', 'tel');
  const address = pickString(content, 'address', 'location');

  const leftCol: BlockData[] = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'left');
  if (email) leftCol.push(textBlock(`Email: ${email}`, bodyTextStyle(theme)));
  if (phone) leftCol.push(textBlock(`Phone: ${phone}`, bodyTextStyle(theme)));
  if (address) leftCol.push(textBlock(address, bodyTextStyle(theme)));

  const rightCol: BlockData[] = [
    inputBlock('Your name', 'Name'),
    inputBlock('you@example.com', 'Email'),
    textareaBlock('Tell us about your project', 'Message'),
    buttonBlock(pickString(content, 'buttonText', 'cta') || 'Send message', 'primary', theme),
  ];

  return columnContainer(
    2,
    [leftCol, rightCol],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'flex-start',
      gap: '64px',
      fontFamily: themeFont(theme),
    },
    'Contact'
  );
};

const translateFooter = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const groups = pickArray(content, 'columns', 'groups', 'menus').map((g) =>
    isRecord(g) ? g : ({} as Record<string, unknown>)
  );
  const copyright =
    pickString(content, 'copyright', 'legal') ||
    `© ${new Date().getFullYear()} ${pickString(content, 'brand', 'company') || 'Company'}. All rights reserved.`;

  const cols: 1 | 2 | 3 = groups.length >= 3 ? 3 : groups.length === 2 ? 2 : 1;
  const colChildren: BlockData[][] = Array.from({ length: cols }, () => []);

  groups.forEach((group, idx) => {
    const cell: BlockData[] = [];
    const title = pickString(group, 'title', 'heading', 'label');
    if (title)
      cell.push(
        textBlock(
          title,
          {
            color: '#ffffff',
            fontFamily: themeFont(theme),
            fontWeight: 700,
            fontSize: '14px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            margin: '0 0 16px 0',
          },
          true
        )
      );
    const links = pickArray(group, 'links', 'items', 'menu');
    links.forEach((l) => {
      const link = isRecord(l) ? l : {};
      const text = pickString(link, 'label', 'name', 'text');
      if (text)
        cell.push(
          textBlock(text, {
            color: '#cbd5e1',
            fontFamily: themeFont(theme),
            fontSize: '14px',
            margin: '4px 0',
            lineHeight: '1.8',
          })
        );
    });
    colChildren[idx % cols].push(...cell);
  });

  if (!groups.length) {
    colChildren[0].push(
      textBlock(
        pickString(content, 'brand', 'company') || 'Company',
        { color: '#ffffff', fontFamily: themeFont(theme), fontSize: '20px', fontWeight: 700 },
        true
      )
    );
  }

  const linksRow = columnContainer(cols, colChildren, { padding: '0', gap: '48px' }, 'Footer columns');
  const copy = textBlock(copyright, {
    color: '#94a3b8',
    fontFamily: themeFont(theme),
    fontSize: '13px',
    margin: '48px 0 0 0',
    textAlign: 'center',
  });

  return columnContainer(
    1,
    [[linksRow, separatorBlock(), copy]],
    {
      padding: '64px 32px',
      backgroundColor: '#0f172a',
      color: '#cbd5e1',
      fontFamily: themeFont(theme),
    },
    'Footer'
  );
};

const translateProcess = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const steps = pickArray(content, 'steps', 'items', 'process').map((s) =>
    isRecord(s) ? s : ({} as Record<string, unknown>)
  );
  const heading = pickString(content, 'title', 'heading') || 'Our process';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');

  const cols: 1 | 2 | 3 = steps.length >= 3 ? 3 : steps.length === 2 ? 2 : 1;
  const cells: BlockData[] = steps.map((step, idx) => {
    const num = pickString(step, 'number', 'step') || String(idx + 1).padStart(2, '0');
    const title = pickString(step, 'title', 'name', 'heading');
    const desc = pickString(step, 'description', 'body', 'text');
    const cell: BlockData[] = [
      textBlock(num, {
        color: themeAccent(theme),
        fontFamily: themeFont(theme),
        fontSize: '32px',
        fontWeight: 700,
        margin: '0 0 8px 0',
      }),
    ];
    if (title)
      cell.push(textBlock(title, { ...headingStyle(theme), fontSize: '20px' }, true));
    if (desc) cell.push(textBlock(desc, bodyTextStyle(theme)));
    return columnContainer(1, [cell], { padding: '0', gap: '4px' }, `Step ${idx + 1}`);
  });

  const gridChildren: BlockData[][] = Array.from({ length: cols }, () => []);
  cells.forEach((b, i) => gridChildren[i % cols].push(b));

  const headerCol = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  const grid = columnContainer(cols, gridChildren, { padding: '0', gap: '32px' }, 'Process steps');

  return columnContainer(
    1,
    [[...headerCol, grid]],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Process'
  );
};

const translateTrustedBy = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const images = isRecord(block.images) ? block.images : {};
  const logos = pickArray(content, 'logos', 'items', 'brands').map((l) => {
    if (typeof l === 'string') return { name: l, src: '' };
    return isRecord(l)
      ? { name: pickString(l, 'name', 'label', 'title'), src: pickString(l, 'src', 'image', 'logo') }
      : { name: '', src: '' };
  });

  const fallbackImages = Object.values(images).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );

  const tiles: BlockData[] = logos.length
    ? logos.map((l) =>
        l.src
          ? imageBlock(l.src, l.name || 'Logo', { height: '32px', width: 'auto', opacity: 0.6 })
          : textBlock(
              l.name,
              {
                color: themeMuted(theme),
                fontFamily: themeFont(theme),
                fontSize: '18px',
                fontWeight: 600,
                opacity: 0.7,
              },
              true
            )
      )
    : fallbackImages.map((src) =>
        imageBlock(src, 'Logo', { height: '32px', width: 'auto', opacity: 0.6 })
      );

  const heading =
    pickString(content, 'title', 'heading') || 'Trusted by teams worldwide';

  return columnContainer(
    1,
    [
      [
        textBlock(heading, {
          color: themeMuted(theme),
          fontFamily: themeFont(theme),
          fontSize: '14px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textAlign: 'center',
          margin: '0 0 24px 0',
        }),
        rowOf(tiles, {
          gap: '48px',
          justifyContent: 'center',
          alignItems: 'center',
        }),
      ],
    ],
    {
      padding: '48px 32px',
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Trusted by'
  );
};

const translateNewsletter = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const heading = pickString(content, 'title', 'heading') || 'Join the newsletter';
  const subtitle =
    pickString(content, 'subtitle', 'description') ||
    'Get product updates and insights delivered to your inbox.';
  const ctaText = pickString(content, 'buttonText', 'cta') || 'Subscribe';

  const col: BlockData[] = sectionHeaderColumn('', heading, subtitle, theme, 'center');
  col.push(
    rowOf(
      [inputBlock('you@example.com', ''), buttonBlock(ctaText, 'primary', theme)],
      { gap: '12px', justifyContent: 'center', maxWidth: '500px', margin: '24px auto 0' }
    )
  );

  return columnContainer(
    1,
    [col],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Newsletter'
  );
};

const translateDashboardPreview = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const images = isRecord(block.images) ? block.images : {};
  const heading = pickString(content, 'title', 'heading') || 'See it in action';
  const subtitle = pickString(content, 'subtitle', 'description');
  const eyebrow = pickString(content, 'eyebrow', 'tag');
  const src = pickString(images, 'dashboard', 'preview', 'image', 'src');

  const col: BlockData[] = sectionHeaderColumn(eyebrow, heading, subtitle, theme, 'center');
  col.push(
    imageBlock(src, 'Dashboard preview', {
      maxWidth: '1100px',
      margin: '32px auto 0',
      boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
      borderRadius: '16px',
    })
  );

  return columnContainer(
    1,
    [col],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      alignItems: 'center',
      fontFamily: themeFont(theme),
    },
    'Dashboard preview'
  );
};

const translateCustomBlock = (block: SemanticBlock, theme?: PageTheme): BlockData => {
  const content = isRecord(block.content) ? block.content : {};
  const title = pickString(content, 'title', 'heading', 'headline');
  const subtitle = pickString(content, 'subtitle', 'description');
  const items = pickArray(content, 'items', 'list', 'features', 'cards').map((it) =>
    isRecord(it) ? it : ({} as Record<string, unknown>)
  );

  const rows: BlockData[] = sectionHeaderColumn('', title, subtitle, theme, 'left');
  items.forEach((item) => {
    const itemTitle = pickString(item, 'title', 'name', 'heading');
    const itemBody = pickString(item, 'description', 'body', 'text');
    if (itemTitle) rows.push(textBlock(itemTitle, { ...headingStyle(theme), fontSize: '20px' }, true));
    if (itemBody) rows.push(textBlock(itemBody, bodyTextStyle(theme)));
  });

  return columnContainer(
    1,
    [rows],
    {
      padding: sectionPadding,
      backgroundColor: themeSurface(theme),
      fontFamily: themeFont(theme),
    },
    `Custom: ${block.customType || 'section'}`
  );
};

const translateSemanticBlock = (block: SemanticBlock, theme?: PageTheme): BlockData | null => {
  const type = safeString(block.type).toLowerCase();
  switch (type) {
    case 'navbar':
    case 'nav':
    case 'header':
    case 'nav-bar':
      return translateNavbar(block, theme);
    case 'hero':
      return translateHero(block, theme, 'default');
    case 'herosplit':
    case 'hero-split':
      return translateHero(block, theme, 'split');
    case 'herocentered':
    case 'hero-centered':
      return translateHero(block, theme, 'centered');
    case 'services':
    case 'features':
      return translateCardGrid(block, theme, 'image', 3);
    case 'featuregrid':
    case 'feature-grid':
      return translateFeatureGrid(block, theme);
    case 'about':
      return translateAbout(block, theme);
    case 'stats':
      return translateStats(block, theme);
    case 'cta':
      return translateCta(block, theme);
    case 'testimonials':
      return translateTestimonials(block, theme);
    case 'team':
      return translateTeam(block, theme);
    case 'pricing':
      return translatePricing(block, theme);
    case 'portfolio':
    case 'gallery':
      return translateGalleryOrPortfolio(block, theme);
    case 'faq':
      return translateFaq(block, theme);
    case 'blog':
      return translateBlog(block, theme);
    case 'contact':
      return translateContact(block, theme);
    case 'footer':
      return translateFooter(block, theme);
    case 'process':
      return translateProcess(block, theme);
    case 'trustedby':
    case 'trusted-by':
    case 'logos':
      return translateTrustedBy(block, theme);
    case 'newsletter':
      return translateNewsletter(block, theme);
    case 'dashboardpreview':
    case 'dashboard-preview':
      return translateDashboardPreview(block, theme);
    case 'custom':
      return translateCustomBlock(block, theme);
    default:
      return translateCustomBlock(block, theme);
  }
};

const buildComponentsFromPage = (
  data: unknown,
  pageType: PageContext
): BlockData[] => {
  const plan = parsePagePlan(data);
  const theme = plan.page.theme;
  const sorted = [...plan.page.blocks].sort(
    (a, b) => (typeof a.order === 'number' ? a.order : 0) - (typeof b.order === 'number' ? b.order : 0)
  );
  const blocks = sorted
    .map((b) => translateSemanticBlock(b, theme))
    .filter((b): b is BlockData => Boolean(b));
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

const getOpenRouterMessageContent = (payload: Record<string, unknown>) => {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return '';
  return firstChoice.message.content;
};

const AI_WEBSITE_BUILDER_PROMPT = `You are an AI Website Builder Engine integrated into a drag-and-drop website editor.

Your task is to generate complete website pages using reusable blocks.

The user will describe the website they want in natural language (or attach a reference image).

You must analyze the request and generate a professional website layout using:
1. Existing predefined blocks from the editor block library
2. OR create custom blocks if required blocks are not available

You must return ONLY valid JSON.

DO NOT return markdown.
DO NOT return explanations.
DO NOT return HTML unless explicitly required inside a custom block.
DO NOT return text outside JSON.

==================================================
PRIMARY GOAL
==================================================

Generate modern, professional, responsive website pages that:
- look production-ready
- follow modern UI/UX practices
- use proper section hierarchy
- include realistic content
- include relevant images
- are conversion-focused
- are visually balanced

==================================================
WEBSITE GENERATION FLOW
==================================================

1. Understand the user's business type
2. Detect website category
3. Detect user intent
4. Detect preferred style
5. Select appropriate blocks
6. Arrange sections logically
7. Generate relevant content
8. Add relevant images
9. Return clean JSON structure

==================================================
VERY IMPORTANT RULES
==================================================

FIRST PRIORITY:
Always use predefined reusable blocks from the existing editor block library.

SECOND PRIORITY:
If a required section does not exist in the block library,
then create a custom block.

The AI is allowed to generate custom blocks ONLY when:
- no suitable predefined block exists
- the user's request requires a unique section
- a niche-specific layout is needed

==================================================
AVAILABLE PREDEFINED BLOCKS
==================================================

Available reusable blocks (use the exact "type" string):

- navbar
- hero
- heroSplit
- heroCentered
- services
- features
- featureGrid
- about
- stats
- cta
- testimonials
- team
- pricing
- portfolio
- faq
- blog
- contact
- footer
- gallery
- process
- trustedBy
- newsletter
- dashboardPreview

Always try to use these first.

==================================================
CUSTOM BLOCK RULES
==================================================

If no matching predefined block exists, generate a custom block.

Custom block requirements:
- modern layout
- responsive structure
- reusable structure
- clean content schema
- professional design logic

Custom block format:

{
  "id": "custom-block-1",
  "type": "custom",
  "customType": "timelineSection",
  "order": 5,
  "content": {},
  "images": {},
  "styles": {},
  "layout": {}
}

Examples where custom blocks may be needed:
- AI chatbot showcase
- Interactive timeline
- Crypto token metrics
- NFT showcase
- Advanced comparison table
- Startup roadmap
- Mobile app showcase
- Bento grid layout
- Before/After comparison
- Industry-specific layouts

==================================================
BLOCK SELECTION RULES
==================================================

IT company website:
  navbar, heroSplit, services, features, stats, about, testimonials, cta, contact, footer

SaaS website:
  navbar, heroCentered, trustedBy, dashboardPreview, features, pricing, faq, cta, footer

Portfolio website:
  navbar, hero, about, portfolio, testimonials, contact, footer

Agency website:
  navbar, heroSplit, services, process, portfolio, testimonials, cta, footer

E-commerce website:
  navbar, hero, gallery, featureGrid, testimonials, faq, newsletter, footer

==================================================
SECTION ORDER RULES
==================================================

Always maintain proper website structure.

Correct homepage flow:
  1. navbar
  2. hero (or heroSplit / heroCentered)
  3. trustedBy
  4. services
  5. features
  6. stats
  7. testimonials
  8. pricing
  9. faq
  10. cta
  11. contact
  12. footer

Never:
- place footer in middle
- place CTA before hero
- place testimonials before hero
- overcrowd sections

==================================================
CONTENT GENERATION RULES
==================================================

Generate realistic and niche-specific content.

DO NOT use lorem ipsum.
DO NOT write "Your headline here", "Sample text", or generic filler.

Generate authentic, plausible:
- professional headlines
- subheadings
- CTA buttons
- feature descriptions
- service descriptions
- statistics (e.g. "200+ projects delivered", "98% client retention")
- testimonials with believable name + role + company
- FAQs
- company descriptions
- contact information

==================================================
COPYWRITING RULES
==================================================

Use modern startup-style copywriting.

GOOD: "Scale Your Business with Smart IT Solutions"
BAD:  "Welcome To Our Website"

Text limits:
- heading max 10 words
- subheading max 30 words
- feature text max 20 words

Use concise, engaging, conversion-focused content.

==================================================
IMAGE RULES
==================================================

Use relevant royalty-free image URLs from Unsplash, Pexels, or Pixabay.

Image selection must match the business niche.

Examples:
- IT company: developers, coding screens, cloud infrastructure, office collaboration
- Restaurant: food, chefs, interiors
- Fitness: gym, trainers, workout scenes
- Fashion: models, clothing, lifestyle photography

Hero images should feel premium.

==================================================
THEME RULES
==================================================

Automatically generate themes based on niche.

Examples:
- IT:     blue / dark navy / white
- Luxury: black / gold
- Eco:    green / earthy tones

Always set:
- primaryColor (hex)
- secondaryColor (hex)
- backgroundColor (hex)
- textColor (hex)
- fontFamily (CSS stack)
- buttonStyle ("filled" | "outlined" | "rounded")
- borderRadius (px)

==================================================
RESPONSIVE DESIGN RULES
==================================================

Ensure:
- spacing consistency
- proper visual hierarchy
- responsive layout structure
- balanced content distribution

==================================================
JSON OUTPUT STRUCTURE
==================================================

Return ONLY valid JSON. The top-level shape MUST be:

{
  "page": {
    "title": "",
    "description": "",
    "theme": {
      "primaryColor": "",
      "secondaryColor": "",
      "backgroundColor": "",
      "textColor": "",
      "fontFamily": "",
      "buttonStyle": "",
      "borderRadius": ""
    },
    "blocks": []
  }
}

==================================================
BLOCK STRUCTURE
==================================================

Each block:

{
  "id": "",
  "type": "",
  "order": 1,
  "content": {},
  "images": {},
  "styles": {}
}

==================================================
PREDEFINED BLOCK EXAMPLE
==================================================

{
  "id": "hero-1",
  "type": "heroSplit",
  "order": 1,
  "content": {
    "headline": "Transform Your Business with Smart IT Solutions",
    "subheadline": "Helping startups and enterprises scale with secure cloud technologies.",
    "primaryButton": "Get Started",
    "secondaryButton": "Book Demo"
  },
  "images": {
    "heroImage": "https://images.unsplash.com/..."
  },
  "styles": {
    "theme": "dark",
    "alignment": "split"
  }
}

==================================================
CUSTOM BLOCK EXAMPLE
==================================================

{
  "id": "custom-block-2",
  "type": "custom",
  "customType": "bentoGridFeatures",
  "order": 4,
  "content": {
    "title": "Why Choose Us",
    "items": [
      {"title": "AI Automation", "description": "Automate workflows using modern AI solutions."},
      {"title": "Cloud Infrastructure", "description": "Scalable cloud systems for fast-growing businesses."}
    ]
  },
  "images": { "backgroundImage": "https://images.unsplash.com/..." },
  "styles": { "columns": 4, "theme": "light" },
  "layout": { "desktop": "grid", "tablet": "2-column", "mobile": "1-column" }
}

==================================================
TESTIMONIAL ITEM EXAMPLE
==================================================

{ "name": "Michael Carter", "role": "CTO", "company": "TechNova", "feedback": "Their solutions completely transformed our infrastructure." }

==================================================
FAQ ITEM EXAMPLE
==================================================

{ "question": "What IT services do you provide?", "answer": "We deliver cloud migration, managed services, and security consulting." }

==================================================
FINAL OUTPUT RULES
==================================================

1. Return ONLY JSON
2. No markdown
3. No explanations
4. No comments
5. Valid syntax
6. Proper block order
7. Realistic content (no lorem ipsum)
8. Relevant images (Unsplash / Pexels / Pixabay URLs)
9. Modern layout structure
10. Use predefined blocks whenever possible
11. Create custom blocks only if necessary
12. Responsive-friendly structure
13. Visual consistency
14. Production-ready output`;

const buildAnalysisContent = ({
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  hasImage,
}: {
  prompt: string;
  requestedLayoutInstruction: string;
  focusInstruction: string;
  hasImage: boolean;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `${AI_WEBSITE_BUILDER_PROMPT}

${focusInstruction}

${
  hasImage
    ? 'A reference image has been attached. Use it as the visual reference for layout, color palette, and section order. Map what you see to the predefined block types listed above — do not output low-level primitive blocks.'
    : ''
}

USER BRIEF: ${prompt || 'Generate a complete homepage for the described business.'}
${requestedLayoutInstruction ? `\nLayout note: ${requestedLayoutInstruction}` : ''}

Return ONLY the JSON object described in JSON OUTPUT STRUCTURE above. The top-level key MUST be "page".`,
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
    text: `You are the second-model quality reviewer for an AI Website Builder.

Your job: take the page JSON the first model produced and return a REPAIRED, production-ready version that follows the predefined-block library exactly.

${focusInstruction}

ALLOWED PREDEFINED BLOCK TYPES:
navbar, hero, heroSplit, heroCentered, services, features, featureGrid, about, stats, cta, testimonials, team, pricing, portfolio, faq, blog, contact, footer, gallery, process, trustedBy, newsletter, dashboardPreview

Anything else MUST use type:"custom" with a descriptive customType.

CURRENT PAGE JSON:
${JSON.stringify(visibleAnalysis, null, 2)}

USER BRIEF: ${prompt || 'Generate a complete homepage.'}
${requestedLayoutInstruction ? `Layout note: ${requestedLayoutInstruction}` : ''}

REVIEW CHECKLIST — apply ALL of these:
1. Block ordering: navbar first, footer last, hero before any content section, CTA never before hero, testimonials never before hero.
2. Block types: every block.type must be one of the predefined list above, or "custom" with a customType.
3. Content quality: NO lorem ipsum, NO "Your headline here", NO placeholder filler. Rewrite generic copy into specific, niche-appropriate copy.
4. Headings <= 10 words. Subheadings <= 30 words. Feature descriptions <= 20 words.
5. Images: every block that needs an image (hero, about, services items, testimonials avatars, gallery, portfolio, dashboardPreview) has a real Unsplash/Pexels/Pixabay URL in the images object or item.image field.
6. Theme: page.theme must have valid hex codes for primaryColor, secondaryColor, backgroundColor, textColor; a fontFamily CSS stack; a buttonStyle; and a borderRadius.
7. Realistic data: testimonials have name+role+company+feedback; pricing has price+period+features+buttonText; stats have value+label; FAQ items have question+answer.
8. Coherence: same brand name across navbar, footer, and copy. Consistent tone for the inferred industry.
9. Block.order is set sequentially starting at 1.
10. No duplicate sections of the same type unless intentional (only one navbar, only one footer).

RETURN ONLY this JSON shape (no markdown, no fences):
{
  "qualityScore": 0,
  "qualityNotes": ["short repair note"],
  "page": {
    "title": "",
    "description": "",
    "theme": {
      "primaryColor": "",
      "secondaryColor": "",
      "backgroundColor": "",
      "textColor": "",
      "fontFamily": "",
      "buttonStyle": "",
      "borderRadius": ""
    },
    "blocks": []
  }
}

Set qualityScore from 0 to 100 after repairs. Use below 80 only if the JSON is structurally broken or cannot be repaired into a professional page.
Keep strings short: qualityNotes entries max 120 characters; page.title max 80 characters.`,
  },
];

const detectSiteMode = (prompt: string): boolean => {
  if (!prompt) return false;
  if (/\b(multi[- ]?page|whole\s+(site|website)|full\s+(site|website)|entire\s+(site|website))\b/i.test(prompt))
    return true;
  if (/\b\d+\s+pages?\b/i.test(prompt)) return true;
  if (
    /\b(create|build|generate|make|design|launch|need|want)\b/i.test(prompt) &&
    /\b(websites?|web\s?sites?)\b/i.test(prompt)
  ) {
    return true;
  }
  return false;
};

type SitePage = {
  slug?: string;
  title?: string;
  pageName?: string;
  description?: string;
  isHome?: boolean;
  blocks: SemanticBlock[];
};

type SiteLayout = { blocks: SemanticBlock[] };

type SiteSpec = {
  brand?: string;
  title?: string;
  description?: string;
  theme?: PageTheme;
  header?: SiteLayout;
  footer?: SiteLayout;
  pages: SitePage[];
};

type SitePlan = {
  qualityScore?: number;
  qualityNotes?: string[];
  site: SiteSpec;
};

const parseLayoutSection = (raw: unknown): SiteLayout | undefined => {
  if (!isRecord(raw)) return undefined;
  const blocks = Array.isArray(raw.blocks)
    ? (raw.blocks.filter(isRecord) as SemanticBlock[])
    : [];
  return { blocks };
};

const parseSitePlan = (data: unknown): SitePlan => {
  if (!isRecord(data)) return { site: { pages: [] } };
  const siteField = isRecord(data.site) ? data.site : data;

  const pages: SitePage[] = Array.isArray(siteField.pages)
    ? (siteField.pages.filter(isRecord) as Record<string, unknown>[]).map((p) => ({
        slug: safeString(p.slug),
        title: safeString(p.title || p.pageName || p.name),
        pageName: safeString(p.pageName || p.title || p.name),
        description: safeString(p.description),
        isHome: Boolean(p.isHome) || safeString(p.slug).toLowerCase() === 'home',
        blocks: Array.isArray(p.blocks)
          ? (p.blocks.filter(isRecord) as SemanticBlock[])
          : [],
      }))
    : [];

  return {
    qualityScore: typeof data.qualityScore === 'number' ? data.qualityScore : undefined,
    qualityNotes: Array.isArray(data.qualityNotes)
      ? data.qualityNotes.filter((n): n is string => typeof n === 'string')
      : undefined,
    site: {
      brand: safeString(siteField.brand),
      title: safeString(siteField.title),
      description: safeString(siteField.description),
      theme: isRecord(siteField.theme) ? (siteField.theme as PageTheme) : undefined,
      header: parseLayoutSection(siteField.header),
      footer: parseLayoutSection(siteField.footer),
      pages,
    },
  };
};

const getSiteQualityScore = (data: unknown) => {
  const plan = parseSitePlan(data);
  return typeof plan.qualityScore === 'number' ? plan.qualityScore : 100;
};

const getSiteQualityNotes = (data: unknown) => parseSitePlan(data).qualityNotes || [];

const kebabify = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const HOME_KEY = '__home__';

type SiteSlugMap = Record<string, string>;

const rewriteHref = (href: string, slugMap: SiteSlugMap): string => {
  if (!href) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^(mailto|tel|sms):/i.test(href)) return href;
  if (href.startsWith('#')) return href;

  const candidate = href.replace(/^\/+/, '').split(/[?#]/)[0];
  if (!candidate) {
    const home = slugMap[HOME_KEY];
    return home ? `/${home}` : href;
  }
  const mapped = slugMap[kebabify(candidate)];
  return mapped ? `/${mapped}` : href;
};

const rewriteSemanticBlockLinks = (
  blocks: SemanticBlock[],
  slugMap: SiteSlugMap
): SemanticBlock[] => {
  const rewriteLink = (link: unknown): unknown => {
    if (!isRecord(link)) return link;
    const href =
      typeof link.href === 'string'
        ? link.href
        : typeof link.url === 'string'
          ? link.url
          : '';
    if (!href) return link;
    return { ...link, href: rewriteHref(href, slugMap) };
  };

  return blocks.map((block) => {
    if (!isRecord(block.content)) return block;
    const newContent: Record<string, unknown> = { ...block.content };

    for (const key of ['links', 'menu', 'items'] as const) {
      const list = newContent[key];
      if (Array.isArray(list)) newContent[key] = list.map(rewriteLink);
    }

    if (Array.isArray(newContent.columns)) {
      newContent.columns = newContent.columns.map((col) => {
        if (!isRecord(col)) return col;
        const colOut: Record<string, unknown> = { ...col };
        for (const k of ['links', 'menu', 'items'] as const) {
          const list = colOut[k];
          if (Array.isArray(list)) colOut[k] = list.map(rewriteLink);
        }
        return colOut;
      });
    }

    if (isRecord(newContent.cta)) {
      const cta = newContent.cta as Record<string, unknown>;
      const href = typeof cta.href === 'string' ? cta.href : '';
      if (href) newContent.cta = { ...cta, href: rewriteHref(href, slugMap) };
    }

    for (const key of ['buttonHref', 'ctaHref', 'primaryButtonHref', 'secondaryButtonHref'] as const) {
      const v = newContent[key];
      if (typeof v === 'string' && v) newContent[key] = rewriteHref(v, slugMap);
    }

    return { ...block, content: newContent };
  });
};

const buildComponentsFromSitePage = (
  page: SitePage,
  theme: PageTheme | undefined,
  pageType: PageContext
): BlockData[] =>
  buildComponentsFromPage({ page: { theme, blocks: page.blocks } }, pageType);

// --- Premade header/footer templates for site-mode -------------------------
// Matches the "horizontal-menu" header template and "brand-copyright" footer
// template from src/app/dashboard/pages/{headerTemplates,footerTemplates}.tsx
// so the AI-generated site uses the same shape a user would pick by hand.
type NavLink = {
  label: string;
  href: string;
  onClick: 'none';
  onClickValue: '';
};

const extractNavbarData = (
  blocks: SemanticBlock[]
): { brand: string; links: NavLink[]; ctaLabel: string; ctaHref: string } => {
  const navBlock = blocks.find((b) => /nav|header/i.test(safeString(b.type)));
  const content = isRecord(navBlock?.content) ? (navBlock!.content as Record<string, unknown>) : {};
  const brand = pickString(content, 'logo', 'brand', 'logoText', 'siteName');
  const links: NavLink[] = pickArray(content, 'links', 'menu', 'items').map((l) => {
    const link = isRecord(l) ? l : {};
    return {
      label: pickString(link, 'label', 'name', 'title', 'text') || 'Link',
      href: pickString(link, 'href', 'url', 'link') || '#',
      onClick: 'none' as const,
      onClickValue: '' as const,
    };
  });
  const cta = isRecord(content.cta) ? (content.cta as Record<string, unknown>) : null;
  const ctaLabel = cta
    ? pickString(cta, 'label', 'text', 'name')
    : pickString(content, 'ctaLabel', 'buttonText');
  const ctaHref = cta
    ? pickString(cta, 'href', 'url') || '#'
    : pickString(content, 'ctaHref') || '#';
  return { brand, links, ctaLabel, ctaHref };
};

const extractFooterData = (
  blocks: SemanticBlock[]
): { brand: string; copyright: string } => {
  const footerBlock = blocks.find((b) => /footer/i.test(safeString(b.type)));
  const content = isRecord(footerBlock?.content)
    ? (footerBlock!.content as Record<string, unknown>)
    : {};
  const brand = pickString(content, 'brand', 'company', 'logo');
  const copyright = pickString(content, 'copyright', 'legal');
  return { brand, copyright };
};

const buildSiteHeaderBlocks = (brand: string, links: NavLink[]): BlockData[] => {
  const finalLinks: NavLink[] = links.length
    ? links
    : [
        { label: 'Home', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'About', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Services', href: '#', onClick: 'none', onClickValue: '' },
        { label: 'Contact', href: '#', onClick: 'none', onClickValue: '' },
      ];

  return [
    {
      uniqueId: crypto.randomUUID(),
      id: 'nav-bar',
      label: 'Nav Bar',
      description: 'Horizontal Menu',
      content: JSON.stringify({
        logo: brand || 'Brand',
        logoType: 'text',
        logoImage: '',
        layout: 'horizontal',
        links: finalLinks,
      }),
      type: 'nav-bar',
      style: {
        width: '100%',
        backgroundColor: '#ffffff',
        color: '#111111',
        padding: '16px 32px',
      },
    },
  ];
};

const buildSiteFooterBlocks = (brand: string, copyrightLine: string): BlockData[] => {
  const year = new Date().getFullYear();
  const safeBrand = brand || 'Brand';
  const copyright = copyrightLine || `© ${year} ${safeBrand}. All rights reserved.`;

  return [
    {
      uniqueId: crypto.randomUUID(),
      id: 'text',
      label: 'Text Block',
      content: safeBrand,
      type: 'text',
      style: {
        fontSize: '20px',
        fontWeight: 700,
        color: '#111111',
        padding: '24px 24px 4px',
        textAlign: 'center',
        width: '100%',
        backgroundColor: '#ffffff',
      },
    },
    {
      uniqueId: crypto.randomUUID(),
      id: 'text',
      label: 'Text Block',
      content: copyright,
      type: 'text',
      style: {
        fontSize: '13px',
        color: '#6b7280',
        padding: '0 24px 24px',
        textAlign: 'center',
        width: '100%',
        backgroundColor: '#ffffff',
      },
    },
  ];
};

const buildSitePromptContent = ({
  prompt,
  hasImage,
}: {
  prompt: string;
  hasImage: boolean;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `${AI_WEBSITE_BUILDER_PROMPT}

==================================================
SITE-MODE OVERRIDE
==================================================

You are generating an ENTIRE WEBSITE — not a single page.

Output MUST contain:
- one shared theme used by every page
- one header (with a navbar block) reused across all pages
- one footer reused across all pages
- N body pages, where N is appropriate to the business (typically 4-7)

How to pick N and which pages:
- If the user said "X pages" or named specific pages, use exactly that.
- Otherwise pick the right pages for the industry:
  * IT services / agency: Home, About, Services, Process, Portfolio, Contact
  * SaaS: Home, Features, Pricing, Docs, Changelog, Contact
  * Portfolio: Home, About, Work, Contact
  * Restaurant: Home, Menu, About, Reservations, Contact
  * E-commerce: Home, Shop, Categories, About, Contact
  * Default: Home, About, Services, Contact

The HEADER navigation links MUST point to the slugs of pages you actually create (e.g. href:"/about", href:"/services"). The first page MUST be Home (slug:"home", isHome:true).

Each page should use a DIFFERENT mix of semantic blocks — do NOT repeat the same hero on every page:
- Home: heroSplit or heroCentered, trustedBy, services, features, stats, testimonials, cta
- About: hero (simpler), about, stats, team, cta
- Services: hero, services, process, faq, cta
- Pricing: hero, pricing, faq, cta
- Portfolio/Work: hero, portfolio, testimonials, cta
- Contact: hero (short), contact

==================================================
SITE OUTPUT STRUCTURE
==================================================

Return ONLY this JSON shape (top-level key "site"):

{
  "site": {
    "brand": "Acme Cloud",
    "title": "Acme Cloud — Smart IT Solutions",
    "description": "One-line meta description.",
    "theme": {
      "primaryColor": "#2563EB",
      "secondaryColor": "#0F172A",
      "backgroundColor": "#FFFFFF",
      "textColor": "#0F172A",
      "fontFamily": "Inter, system-ui, sans-serif",
      "buttonStyle": "filled",
      "borderRadius": "10px"
    },
    "header": {
      "blocks": [
        {
          "id": "site-nav",
          "type": "navbar",
          "order": 1,
          "content": {
            "logo": "Acme Cloud",
            "links": [
              {"label":"Home","href":"/home"},
              {"label":"About","href":"/about"},
              {"label":"Services","href":"/services"},
              {"label":"Contact","href":"/contact"}
            ],
            "cta": {"label":"Get a quote","href":"/contact"}
          }
        }
      ]
    },
    "footer": {
      "blocks": [
        {
          "id": "site-footer",
          "type": "footer",
          "order": 1,
          "content": {
            "brand": "Acme Cloud",
            "copyright": "© 2026 Acme Cloud. All rights reserved.",
            "columns": [
              {"title":"Product","links":[{"label":"Features","href":"/services"},{"label":"Pricing","href":"/pricing"}]},
              {"title":"Company","links":[{"label":"About","href":"/about"},{"label":"Contact","href":"/contact"}]}
            ]
          }
        }
      ]
    },
    "pages": [
      {
        "slug": "home",
        "title": "Home",
        "pageName": "Home",
        "isHome": true,
        "blocks": [ /* semantic blocks for the home page */ ]
      },
      {
        "slug": "about",
        "title": "About",
        "pageName": "About Us",
        "isHome": false,
        "blocks": [ /* semantic blocks for the about page */ ]
      }
    ]
  }
}

Site-mode rules:
- Slugs are kebab-case, no leading slash (just "about", not "/about").
- Header/footer blocks live in site.header.blocks and site.footer.blocks — NOT in any page.blocks.
- Page blocks reuse the predefined block list. Use custom blocks only when necessary.
- Same brand name and theme are consistent across every page.
- Navbar links use the slugs of pages you actually generated.
- No lorem ipsum. Realistic content tailored to the industry.

${hasImage ? 'A reference image has been attached — use it as the visual reference for theme and home page layout. Other pages should follow the same visual style.' : ''}

USER BRIEF: ${prompt || 'Generate a complete multi-page website for the described business.'}

Return ONLY the JSON object with top-level key "site". No markdown, no explanations.`,
  },
];

const buildSiteReviewContent = ({
  prompt,
  visibleSite,
}: {
  prompt: string;
  visibleSite: unknown;
}): GroqContentPart[] => [
  {
    type: 'text',
    text: `You are the quality reviewer for an AI Website Builder in SITE mode.

Validate and repair a multi-page site JSON. Return a corrected version with a qualityScore from 0 to 100.

ALLOWED PREDEFINED BLOCK TYPES:
navbar, hero, heroSplit, heroCentered, services, features, featureGrid, about, stats, cta, testimonials, team, pricing, portfolio, faq, blog, contact, footer, gallery, process, trustedBy, newsletter, dashboardPreview

Anything else MUST use type:"custom" with a descriptive customType.

CURRENT SITE JSON:
${JSON.stringify(visibleSite, null, 2)}

USER BRIEF: ${prompt || 'Generate a complete website.'}

REVIEW CHECKLIST:
1. site.header.blocks contains exactly one navbar block; no body content.
2. site.footer.blocks contains exactly one footer block.
3. site.pages has at least 2 pages. Exactly one page has isHome:true and slug:"home".
4. Every page.slug is unique, kebab-case, no leading slash.
5. Header navbar links point only to slugs that appear in site.pages.
6. Each page has its own appropriate hero. Vary the hero variant per page.
7. No lorem ipsum, no "Your headline here" placeholders. Rewrite generic copy.
8. site.theme has valid 6-digit hex codes for primaryColor/secondaryColor/backgroundColor/textColor and a real CSS fontFamily stack.
9. Brand name is consistent across header logo, footer brand, and content references.
10. Every page.block.type is in the allowed list or is "custom" with a customType.
11. Pages contain realistic content; testimonials have name+role+company+feedback; pricing has price+features+buttonText.

RETURN ONLY this JSON (no markdown):
{
  "qualityScore": 0,
  "qualityNotes": ["short repair note"],
  "site": { /* repaired site object matching the input structure */ }
}

qualityScore below 80 only if the site is structurally unrecoverable.`,
  },
];

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
          const reviewedAnalysis = parseModelJson(getOpenRouterMessageContent(reviewPayload));
          const reviewedBlocks = getPageBlocks(parsePagePlan(reviewedAnalysis));

          if (reviewedBlocks.length > 0) {
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
  config,
}: {
  provider: AnalysisProvider;
  apiKey: string;
  content: GroqContentPart[];
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
      analysis: parseModelJson(getOpenRouterMessageContent(payload)),
    };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
};

const generateReviewedAnalysisWithFallback = async ({
  content,
  prompt,
  requestedLayoutInstruction,
  focusInstruction,
  config,
}: {
  content: GroqContentPart[];
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

        const qualityScore = getPageQualityScore(reviewedAnalysis);

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

    if (detectSiteMode(prompt)) {
      const apiKey = getOpenRouterApiKey(aiConfig);
      const sitePromptParts = buildSitePromptContent({ prompt, hasImage });
      const sitePromptContent = hasImage
        ? [...sitePromptParts, { type: 'image_url' as const, image_url: { url: imageDataUrl } }]
        : sitePromptParts;

      const sitePayload = await callOpenRouterJson(apiKey, {
        model: aiConfig.openrouterModel,
        messages: [{ role: 'user', content: sitePromptContent }],
        max_completion_tokens: 16384,
      });
      const initialSite = parseModelJson(getOpenRouterMessageContent(sitePayload));

      let reviewedSite: unknown = initialSite;
      let siteReviewPayload: Record<string, unknown> | null = null;
      try {
        const reviewContent = buildSiteReviewContent({ prompt, visibleSite: initialSite });
        siteReviewPayload = await callOpenRouterJson(apiKey, {
          model: aiConfig.openrouterReviewModel,
          messages: [{ role: 'user', content: reviewContent }],
          max_completion_tokens: 16384,
        });
        reviewedSite = parseModelJson(getOpenRouterMessageContent(siteReviewPayload));
      } catch (err) {
        console.warn('[AI] site review failed, using initial site:', err);
      }

      const siteQualityScore = getSiteQualityScore(reviewedSite);
      const siteQualityNotes = getSiteQualityNotes(reviewedSite);

      if (siteQualityScore < aiConfig.minQualityScore) {
        return NextResponse.json(
          {
            message:
              'Site quality check failed. Try a clearer prompt or a more specific business description.',
            qualityScore: siteQualityScore,
            qualityNotes: siteQualityNotes,
          },
          { status: 422 }
        );
      }

      const plan = parseSitePlan(reviewedSite);

      if (!plan.site.pages.length) {
        return NextResponse.json(
          { message: 'AI returned site JSON but no pages were defined.' },
          { status: 422 }
        );
      }

      const decoded = jwtDecode<{ userId: string }>(token);
      const userId = decoded.userId;
      const pageDb = await getPageDbConnection();
      const PageDoc = getPageModel(pageDb);

      const translatePipeline = (
        blocks: SemanticBlock[],
        context: PageContext
      ): BlockData[] => {
        const components = buildComponentsFromSitePage(
          { blocks } as SitePage,
          plan.site.theme,
          context
        )
          .map((block) => sanitizeBlock(block, 0, { count: 0 }))
          .filter((b): b is BlockData => Boolean(b))
          .map(enforceColumnCounts)
          .map(flattenSingleChildColumns)
          .map(ensureFlexOnMultiColumnContainers)
          .map(repairIntroMetricsTimerSection)
          .map((b) => repairDarkSectionContrast(b))
          .map(applyEditorBlockDefaults);
        return enforcePageScope(components, context);
      };

      const enrichOrFallback = async (
        components: BlockData[],
        topic: string
      ): Promise<BlockData[]> => {
        try {
          return await enrichComponentsWithImages(components, topic, industryTags);
        } catch (err) {
          console.warn('[AI] site enrichment failed:', err);
          return components;
        }
      };

      const ts = Date.now();
      const uniqueSlug = (base: string, suffix: string) =>
        `${kebabify(base) || suffix}-${ts}`;

      const brand = plan.site.brand || 'Site';

      // Industry tags drive all image searches across the site so a single
      // "IT services" prompt never ends up with cat photos in the about
      // section. Computed once from the user prompt and reused for every page.
      const industryTags = inferIndustryTags(prompt);

      // Sort pages so isHome lands first, then precompute every final slug.
      const sortedPages = [...plan.site.pages].sort(
        (a, b) => (a.isHome ? -1 : 0) - (b.isHome ? -1 : 0)
      );
      const pageSlugs: string[] = sortedPages.map((p) =>
        uniqueSlug(p.slug || p.title || p.pageName || 'page', 'site-page')
      );

      // Build map: intendedSlug → actualSlug, so AI links like "/about" can be
      // rewritten to "/about-1748023456789" before we save anything.
      const slugMap: SiteSlugMap = {};
      sortedPages.forEach((page, idx) => {
        const intended = kebabify(page.slug || page.title || page.pageName || '');
        if (intended) slugMap[intended] = pageSlugs[idx];
      });
      const homeIdx = sortedPages.findIndex((p) => p.isHome);
      const homeSlug = pageSlugs[homeIdx >= 0 ? homeIdx : 0];
      if (homeSlug) {
        slugMap.home = homeSlug;
        slugMap[HOME_KEY] = homeSlug;
      }

      const headerBlocks = plan.site.header?.blocks?.length
        ? rewriteSemanticBlockLinks(plan.site.header.blocks, slugMap)
        : [];
      const footerBlocks = plan.site.footer?.blocks?.length
        ? rewriteSemanticBlockLinks(plan.site.footer.blocks, slugMap)
        : [];

      const createdPages: Array<{
        _id: string;
        pageName: string;
        slug: string;
        pageType: 'page' | 'header' | 'footer';
        isHome: boolean;
      }> = [];

      // Use the "horizontal-menu" header template structure (from
      // headerTemplates.tsx). AI provides brand + links + cta; template
      // provides layout/style. Hrefs were already rewritten to actual slugs
      // by rewriteSemanticBlockLinks above.
      {
        const navData = extractNavbarData(headerBlocks);
        const headerBrand = navData.brand || brand;
        const headerComponents = buildSiteHeaderBlocks(headerBrand, navData.links);

        await PageDoc.updateMany(
          { pageType: 'header', isGlobal: true, createdBy: userId },
          { $set: { isGlobal: false } }
        );
        const created = await PageDoc.create({
          pageName: `${headerBrand} Header`,
          slug: uniqueSlug(`${headerBrand}-header`, 'site-header'),
          pageType: 'header',
          isPublished: true,
          isGlobal: true,
          component: headerComponents,
          createdBy: userId,
          modifications: [{ modifiedBy: userId, modifiedAt: new Date() }],
        });
        createdPages.push({
          _id: String(created._id),
          pageName: created.pageName,
          slug: created.slug,
          pageType: 'header',
          isHome: false,
        });
      }

      // Use the "brand-copyright" footer template structure (from
      // footerTemplates.tsx). AI provides brand + copyright line.
      {
        const footerData = extractFooterData(footerBlocks);
        const footerBrand = footerData.brand || brand;
        const footerComponents = buildSiteFooterBlocks(footerBrand, footerData.copyright);

        await PageDoc.updateMany(
          { pageType: 'footer', isGlobal: true, createdBy: userId },
          { $set: { isGlobal: false } }
        );
        const created = await PageDoc.create({
          pageName: `${footerBrand} Footer`,
          slug: uniqueSlug(`${footerBrand}-footer`, 'site-footer'),
          pageType: 'footer',
          isPublished: true,
          isGlobal: true,
          component: footerComponents,
          createdBy: userId,
          modifications: [{ modifiedBy: userId, modifiedAt: new Date() }],
        });
        createdPages.push({
          _id: String(created._id),
          pageName: created.pageName,
          slug: created.slug,
          pageType: 'footer',
          isHome: false,
        });
      }

      let home: { _id: string; slug: string; pageName: string; components: BlockData[] } | null =
        null;

      // Demote any existing home page for this user so the new one wins.
      await PageDoc.updateMany(
        {
          isHome: true,
          createdBy: userId,
          $or: [{ pageType: 'page' }, { pageType: { $exists: false } }],
        },
        { $set: { isHome: false } }
      );

      for (let idx = 0; idx < sortedPages.length; idx++) {
        const page = sortedPages[idx];
        if (!page.blocks?.length) continue;
        const rewrittenBlocks = rewriteSemanticBlockLinks(page.blocks, slugMap);
        const components = await enrichOrFallback(
          translatePipeline(rewrittenBlocks, 'page'),
          `${brand} ${page.title || page.slug || ''} ${prompt}`.trim()
        );
        if (!components.length) continue;

        const slug = pageSlugs[idx];
        const pageName = page.pageName || page.title || 'Untitled';
        const isHomePage: boolean = Boolean(page.isHome) || home === null;

        const created: { _id: unknown; pageName: string; slug: string } = await PageDoc.create({
          pageName,
          description: page.description || undefined,
          slug,
          pageType: 'page',
          isPublished: true,
          isHome: isHomePage,
          isGlobal: false,
          component: components,
          createdBy: userId,
          modifications: [{ modifiedBy: userId, modifiedAt: new Date() }],
        });

        createdPages.push({
          _id: String(created._id),
          pageName: created.pageName,
          slug: created.slug,
          pageType: 'page',
          isHome: isHomePage,
        });

        if (isHomePage && !home) {
          home = {
            _id: String(created._id),
            slug: created.slug,
            pageName: created.pageName,
            components,
          };
        }
      }

      if (!home || !createdPages.some((p) => p.pageType === 'page')) {
        return NextResponse.json(
          { message: 'Site was generated but no body pages could be saved.' },
          { status: 422 }
        );
      }

      return NextResponse.json({
        mode: 'site',
        userId,
        brand,
        pages: createdPages,
        home: {
          _id: home._id,
          slug: home.slug,
          pageName: home.pageName,
          url: `/${home.slug}`,
          components: home.components,
        },
        qualityScore: siteQualityScore,
        qualityNotes: siteQualityNotes,
        usage: {
          generation: sitePayload?.usage,
          review: siteReviewPayload?.usage,
        },
      });
    }

    const analysisContentParts = buildAnalysisContent({
      prompt,
      requestedLayoutInstruction,
      focusInstruction,
      hasImage,
    });

    const analysisContent = hasImage
      ? [...analysisContentParts, { type: 'image_url' as const, image_url: { url: imageDataUrl } }]
      : analysisContentParts;
    const analysisResult = await generateReviewedAnalysisWithFallback({
      content: analysisContent,
      prompt,
      requestedLayoutInstruction,
      focusInstruction,
      config: aiConfig,
    });
    const visibleAnalysis = analysisResult.reviewedAnalysis;
    const reviewPayload = analysisResult.reviewPayload;
    const qualityScore = getPageQualityScore(visibleAnalysis);

    if (qualityScore < aiConfig.minQualityScore) {
      return NextResponse.json(
        {
          message:
            'The AI result did not pass the quality check. Try a clearer prompt or a higher-resolution image.',
          qualityScore,
          qualityNotes: getPageQualityNotes(visibleAnalysis),
        },
        { status: 422 }
      );
    }

    const components = buildComponentsFromPage(visibleAnalysis, pageType)
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

    let enrichedComponents = layoutAdjustedComponents;
    const singlePageIndustryTags = inferIndustryTags(prompt);
    try {
      enrichedComponents = await enrichComponentsWithImages(
        layoutAdjustedComponents,
        prompt,
        singlePageIndustryTags
      );
    } catch (err) {
      console.warn('[AI] image enrichment failed; returning unenriched blocks:', err);
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
            hasImage: true,
          });
          const focusedResult = await generateReviewedAnalysisWithFallback({
            content: [
              ...focusedAnalysisParts,
              { type: 'image_url' as const, image_url: { url: imageDataUrl } },
            ],
            prompt: `Extract ONLY the ${focus} of the image.`,
            requestedLayoutInstruction: '',
            focusInstruction: instruction,
            config: aiConfig,
          });
          const focusedAnalysis = focusedResult.reviewedAnalysis;

          if (getPageQualityScore(focusedAnalysis) < aiConfig.minQualityScore) {
            return undefined;
          }

          const focusedComponents = buildComponentsFromPage(focusedAnalysis, focus)
            .map((block) => sanitizeBlock(block, 0, { count: 0 }))
            .filter((block): block is BlockData => Boolean(block))
            .map(enforceColumnCounts)
            .map(flattenSingleChildColumns)
            .map(ensureFlexOnMultiColumnContainers)
            .map(repairIntroMetricsTimerSection)
            .map((block) => repairDarkSectionContrast(block))
            .map(applyEditorBlockDefaults);
          const scopedComponents = enforcePageScope(focusedComponents, focus);
          if (scopedComponents.length === 0) return undefined;
          try {
            return await enrichComponentsWithImages(scopedComponents, prompt, singlePageIndustryTags);
          } catch (err) {
            console.warn(`[AI] image enrichment failed for ${focus}:`, err);
            return scopedComponents;
          }
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
      components: enrichedComponents,
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
      qualityNotes: getPageQualityNotes(visibleAnalysis),
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
