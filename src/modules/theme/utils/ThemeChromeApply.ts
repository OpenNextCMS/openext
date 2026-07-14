import { randomUUID } from 'crypto';
import mongoose, { type Connection, type Model } from 'mongoose';
import type { ITheme } from '@/types/theme';
import type { BuiltThemeBlock } from './ThemeLayoutBuilder';

/**
 * Apply theme header/footer chrome to global Page documents.
 * Always upserts + marks the theme chrome as the sole active (isGlobal) part
 * for that pageType so public pages actually pick it up.
 */

type PageModel = Model<Record<string, unknown>>;

function extractBlocks(tpl: unknown): unknown[] | null {
  if (!tpl) return null;
  if (Array.isArray(tpl)) return tpl;
  if (typeof tpl === 'object' && tpl !== null) {
    const obj = tpl as { blocks?: unknown; component?: unknown };
    if (Array.isArray(obj.component)) return obj.component;
    if (Array.isArray(obj.blocks)) return obj.blocks;
  }
  return null;
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  if (!value) return undefined;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const s = String(value);
  if (mongoose.Types.ObjectId.isValid(s)) return new mongoose.Types.ObjectId(s);
  return undefined;
}

/** Map package template shorthand types onto canvas block types. */
export function normalizeChromeBlocks(blocks: unknown[]): unknown[] {
  return blocks.map((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const block = { ...(raw as Record<string, unknown>) };
    const type = String(block.type || '').toLowerCase();

    if (
      type === 'navbar-split' ||
      type === 'navbar-centered' ||
      type === 'navbar-default' ||
      type === 'navbar' ||
      type.startsWith('navbar-')
    ) {
      block.type = 'nav-bar';
    }

    if (
      type === 'footer-default' ||
      type === 'footer' ||
      type === 'footer-section' ||
      type.startsWith('footer-')
    ) {
      block.type = 'footer-section';
    }

    if (!block.uniqueId) {
      block.uniqueId = `theme-chrome-${randomUUID().slice(0, 8)}`;
    }

    if (block.type === 'nav-bar') {
      try {
        const parsed =
          typeof block.content === 'string' && block.content.startsWith('{')
            ? (JSON.parse(block.content) as Record<string, unknown>)
            : { logo: 'Brand', links: [] };
        if (!parsed.logoSource) parsed.logoSource = 'custom';
        if (!parsed.logoType) parsed.logoType = 'text';
        if (!parsed.layout) parsed.layout = 'horizontal';
        if (!Array.isArray(parsed.links)) {
          parsed.links = [
            { label: 'Home', href: '#' },
            { label: 'Features', href: '#' },
            { label: 'Pricing', href: '#' },
          ];
        }
        block.content = JSON.stringify(parsed);
      } catch {
        block.content = JSON.stringify({
          logo: 'Brand',
          logoType: 'text',
          logoSource: 'custom',
          layout: 'horizontal',
          links: [
            { label: 'Home', href: '#' },
            { label: 'Features', href: '#' },
          ],
        });
      }
    }

    if (block.type === 'footer-section' && !block.content) {
      block.content = JSON.stringify({
        columns: [
          { title: 'Product', links: ['Features', 'Pricing'] },
          { title: 'Company', links: ['About', 'Contact'] },
        ],
      });
    }

    return block;
  });
}

function defaultNavbarBlock(logo = 'Brand'): BuiltThemeBlock {
  return {
    type: 'nav-bar',
    uniqueId: `theme-navbar-${randomUUID().slice(0, 8)}`,
    content: JSON.stringify({
      logo,
      logoType: 'text',
      logoSource: 'custom',
      layout: 'horizontal',
      links: [
        { label: 'Home', href: '#' },
        { label: 'Features', href: '#' },
        { label: 'Pricing', href: '#' },
        { label: 'Contact', href: '#' },
      ],
    }),
  };
}

function defaultFooterBlock(): BuiltThemeBlock {
  return {
    type: 'footer-section',
    uniqueId: `theme-footer-${randomUUID().slice(0, 8)}`,
    content: JSON.stringify({
      columns: [
        { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
        { title: 'Company', links: ['About', 'Careers', 'Contact'] },
        { title: 'Support', links: ['Help', 'Status'] },
      ],
    }),
  };
}

async function upsertGlobalPart(
  Page: PageModel,
  pageType: 'header' | 'footer',
  component: unknown[],
  ownerId?: mongoose.Types.ObjectId
): Promise<'updated' | 'created' | 'skipped'> {
  if (!component.length) return 'skipped';

  // Prefer the part the public renderer will pick for this owner (ownership-aware),
  // then any current global, then create.
  const existing =
    (ownerId
      ? await Page.findOne({ pageType, createdBy: ownerId }).sort({ isGlobal: -1, updatedAt: -1 }).exec()
      : null) ||
    (await Page.findOne({ pageType, isGlobal: true }).sort({ updatedAt: -1 }).exec()) ||
    (await Page.findOne({ pageType }).sort({ updatedAt: -1 }).exec());

  // Make this the sole active global layout part (same pattern as onboarding).
  await Page.updateMany({ pageType }, { $set: { isGlobal: false } }).exec();

  if (existing) {
    existing.set('component', component);
    existing.set('isPublished', true);
    existing.set('isGlobal', true);
    if (ownerId) existing.set('createdBy', ownerId);
    await existing.save();
    return 'updated';
  }

  const doc: Record<string, unknown> = {
    pageName: pageType === 'header' ? 'Theme Header' : 'Theme Footer',
    slug: `theme-${pageType}-${Date.now()}`,
    pageType,
    isGlobal: true,
    isPublished: true,
    isHome: false,
    component,
  };
  if (ownerId) doc.createdBy = ownerId;

  await Page.create(doc);
  return 'created';
}

/**
 * Resolve header/footer blocks for a theme:
 * 1) templates/header.json & footer.json (preferred)
 * 2) chrome blocks from layouts that include navbar/footer
 * 3) synthetic defaults (so apply never silently skips chrome)
 */
export function resolveThemeChrome(
  theme: Pick<ITheme, 'name' | 'templates' | 'presets' | 'componentVariants'>,
  chromeFromLayout?: { navbar?: BuiltThemeBlock; footer?: BuiltThemeBlock },
  opts?: { forceDefaults?: boolean }
): { header: unknown[]; footer: unknown[] } {
  const fromHeaderTpl = extractBlocks(theme.templates?.header);
  const fromFooterTpl = extractBlocks(theme.templates?.footer);

  let headerBlocks =
    (fromHeaderTpl && fromHeaderTpl.length ? fromHeaderTpl : null) ||
    (chromeFromLayout?.navbar ? [chromeFromLayout.navbar] : null);

  let footerBlocks =
    (fromFooterTpl && fromFooterTpl.length ? fromFooterTpl : null) ||
    (chromeFromLayout?.footer ? [chromeFromLayout.footer] : null);

  if ((!headerBlocks || !headerBlocks.length) && opts?.forceDefaults !== false) {
    headerBlocks = [defaultNavbarBlock(theme.name || 'Brand')];
  }
  if ((!footerBlocks || !footerBlocks.length) && opts?.forceDefaults !== false) {
    footerBlocks = [defaultFooterBlock()];
  }

  return {
    header: normalizeChromeBlocks(headerBlocks || []),
    footer: normalizeChromeBlocks(footerBlocks || []),
  };
}

export async function applyThemeHeaderFooter(
  pageDb: Connection,
  theme: Pick<ITheme, 'name' | 'templates' | 'presets' | 'componentVariants' | 'createdBy'>,
  opts?: {
    chromeFromLayout?: { navbar?: BuiltThemeBlock; footer?: BuiltThemeBlock };
    createdBy?: string;
    /** When true (default), synthesize navbar/footer if the package omitted them. */
    forceDefaults?: boolean;
  }
): Promise<{ header: 'updated' | 'created' | 'skipped'; footer: 'updated' | 'created' | 'skipped' }> {
  const { getPageModel } = await import('@/utils/db');
  const Page = getPageModel(pageDb) as unknown as PageModel;

  // Align ownership with the homepage so getPageDataForSlug's createdBy filter matches.
  let ownerId = toObjectId(opts?.createdBy) || toObjectId(theme.createdBy);
  if (!ownerId) {
    const home =
      (await Page.findOne({ isHome: true, pageType: 'page' }).select('createdBy').lean().exec()) ||
      (await Page.findOne({ pageType: 'page' }).sort({ updatedAt: -1 }).select('createdBy').lean().exec());
    ownerId = toObjectId((home as { createdBy?: unknown } | null)?.createdBy);
  }

  const { header, footer } = resolveThemeChrome(theme, opts?.chromeFromLayout, {
    forceDefaults: opts?.forceDefaults !== false,
  });

  return {
    header: await upsertGlobalPart(Page, 'header', header, ownerId),
    footer: await upsertGlobalPart(Page, 'footer', footer, ownerId),
  };
}
