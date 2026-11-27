/**
 * ensureDefaultHomePage — idempotent OpenExt/OpenNext default homepage seed.
 *
 * Creates `slug: default_home` with the known OpenNext default block layout
 * (black header + Hello World body + fixed footer) regardless of whether
 * SuperAdmin onboarding has been completed or skipped.
 * Safe to call from registration, onboarding, skip, and generate flows.
 *
 * Site chrome is embedded in the page itself; public rendering must skip
 * global header/footer for this slug to avoid double chrome.
 */
import type mongoose from 'mongoose';
import defaultHomeComponent from '@/app/themes/openNextDefault/public/data/default.json';
import { getPageDbConnection, getPageModel } from '@/utils/db';

export const DEFAULT_HOME_SLUG = 'default_home';

export type EnsureDefaultHomePageResult = {
  created: boolean;
  repaired: boolean;
  slug: string;
};

/** Minimal model surface shared by mongoose + MySQL/Postgres adapters. */
export type DefaultHomePageModel = {
  findOne: (filter: Record<string, unknown>) => {
    lean: () => {
      exec: () => Promise<{ _id?: unknown; component?: unknown; isHome?: boolean } | null>;
    };
  };
  updateOne: (
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ) => {
    exec: () => Promise<unknown>;
  };
  create: (doc: Record<string, unknown>) => Promise<unknown>;
};

/** Canonical uniqueIds from the OpenNext all-in-one default.json. */
const CANONICAL_EMBEDDED_CHROME_IDS = [
  'bca71b24-0518-4320-826a-d6c6a3d82a03', // fixed header
  '34382247-9d27-4538-8f59-6b721a146457', // fixed footer
] as const;

/** Page.component must be BlockData[]; wrap a single root block when needed. */
function asComponentArray(component: unknown): unknown[] {
  if (Array.isArray(component)) return component;
  if (component && typeof component === 'object') return [component];
  return [];
}

const defaultHomeBlocks = asComponentArray(defaultHomeComponent);

function hasUsableComponent(component: unknown): boolean {
  const blocks = asComponentArray(component);
  if (blocks.length === 0) return false;
  const tree = blocks[0] as { type?: unknown; children?: unknown };
  return Boolean(tree.type) || (Array.isArray(tree.children) && tree.children.length > 0);
}

function collectUniqueIds(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collectUniqueIds(child, out);
    return;
  }
  const obj = node as { uniqueId?: unknown; children?: unknown };
  if (typeof obj.uniqueId === 'string' && obj.uniqueId) out.add(obj.uniqueId);
  if (obj.children != null) collectUniqueIds(obj.children, out);
}

/** True when default_home is missing its canonical in-page header/footer. */
function missingCanonicalChrome(component: unknown): boolean {
  const ids = new Set<string>();
  collectUniqueIds(component, ids);
  return CANONICAL_EMBEDDED_CHROME_IDS.some((id) => !ids.has(id));
}

/** True when component was stored as a bare object instead of BlockData[]. */
function isNonArrayComponent(component: unknown): boolean {
  return Boolean(component) && typeof component === 'object' && !Array.isArray(component);
}

export function buildDefaultHomePagePayload(
  createdBy: string | mongoose.Types.ObjectId,
  component?: unknown
) {
  return {
    pageName: 'Default Page',
    createdBy,
    isPublished: true,
    isHome: true,
    pageType: 'page' as const,
    preHeading: 'Welcome to OpenNext',
    description: 'This is a default page created during registration.',
    seoName: 'OpenNext',
    seoMeta: 'OpenNext is a React framework for the web.',
    slug: DEFAULT_HOME_SLUG,
    component: component != null ? asComponentArray(component) : defaultHomeBlocks,
  };
}

/**
 * Ensure the OpenExt default homepage exists with the classic OpenNext layout.
 * @param pageModel Optional Page model (registration before .env is ready).
 * @param createdBy Owner user id; required when creating a missing page.
 * @param component Optional block tree; defaults to openNextDefault default.json.
 */
export async function ensureDefaultHomePage(options?: {
  pageModel?: DefaultHomePageModel;
  createdBy?: string | mongoose.Types.ObjectId;
  component?: unknown;
}): Promise<EnsureDefaultHomePageResult> {
  const PageModel: DefaultHomePageModel =
    options?.pageModel ||
    (getPageModel(await getPageDbConnection()) as unknown as DefaultHomePageModel);

  const existing = (await PageModel.findOne({
    slug: DEFAULT_HOME_SLUG,
    pageType: 'page',
  })
    .lean()
    .exec()) as { _id?: unknown; component?: unknown; isHome?: boolean } | null;

  if (existing) {
    const needsComponentRepair =
      !hasUsableComponent(existing.component) ||
      missingCanonicalChrome(existing.component) ||
      isNonArrayComponent(existing.component);
    const needsHomeFlag = existing.isHome !== true;
    if (needsComponentRepair || needsHomeFlag) {
      const patch: Record<string, unknown> = {};
      if (needsComponentRepair) {
        // Prefer caller component only for brand-new empty pages; stripped,
        // non-array, or incomplete layouts must be restored as BlockData[].
        patch.component =
          !hasUsableComponent(existing.component) && options?.component
            ? asComponentArray(options.component)
            : defaultHomeBlocks;
      }
      if (needsHomeFlag) {
        patch.isHome = true;
        patch.isPublished = true;
      }
      await PageModel.updateOne({ _id: existing._id }, { $set: patch }).exec();
      return { created: false, repaired: true, slug: DEFAULT_HOME_SLUG };
    }
    return { created: false, repaired: false, slug: DEFAULT_HOME_SLUG };
  }

  const createdBy = options?.createdBy;
  if (!createdBy) {
    // Without an owner we cannot create a valid page row; caller should retry with userId.
    console.warn(
      '[ensureDefaultHomePage] default_home missing and no createdBy provided — skipped create'
    );
    return { created: false, repaired: false, slug: DEFAULT_HOME_SLUG };
  }

  await PageModel.create(buildDefaultHomePagePayload(createdBy, options?.component));

  return { created: true, repaired: false, slug: DEFAULT_HOME_SLUG };
}
