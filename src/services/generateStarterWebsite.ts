/**
 * generateStarterWebsite — the orchestrator for the first-time setup wizard.
 *
 * Assembles a complete, editable starter website from predefined templates,
 * personalized copy and category-matched imagery, then activates the chosen
 * theme. Everything is composed from EXISTING CMS blocks and saved as ordinary
 * Page documents, so the result is fully editable in the visual editor.
 *
 * The operation is idempotent: if the user has already generated a site it is a
 * no-op that returns the existing homepage (prevents duplicate submissions).
 */
import type { Connection, Model } from 'mongoose';
import {
  getPageDbConnection,
  getPageModel,
  getWebsitePreferencesModel,
  getUserDbConnection,
  getUserModel,
} from '@/utils/db';
import type { PageDocument } from '@/types/index';
import type { BlockData } from '@/types/index';
import { ThemeService } from '@/lib/theme/theme-service';
import { personalizeContent } from './content-personalizer';
import { buildBlocks } from './blockFactory';
import { getImagesForBusiness } from '@/lib/image-library';
import { getHomepageTemplate } from '@/templates/homepages';
import { getHeaderTemplate } from '@/templates/headers';
import { getFooterTemplate } from '@/templates/footers';
import {
  getSupportingPages,
  getPageBlocks,
  getNavLinks,
  slugify,
} from '@/templates/pages';
import { WIZARD_THEME_TO_SLUG } from '@/templates/types';

export interface GenerateInput {
  userId: string;
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  targetAudience?: string;
  location?: string;
  websiteType: string;
  headerTemplate: string;
  footerTemplate: string;
  theme: string;
}

export interface GenerateResult {
  homepageSlug: string;
  pages: { name: string; slug: string }[];
  themeSlug: string;
  alreadyGenerated: boolean;
}

const HEADER_SLUG = 'site-header';
const FOOTER_SLUG = 'site-footer';
const HOMEPAGE_SLUG = 'home';

/** Create a page, retrying with a numeric slug suffix on a duplicate-key clash. */
async function createPage(
  PageModel: Model<PageDocument>,
  userId: string,
  fields: {
    pageName: string;
    slug: string;
    component: BlockData[];
    pageType?: 'page' | 'header' | 'footer';
    isHome?: boolean;
    isGlobal?: boolean;
    description?: string;
  }
): Promise<PageDocument> {
  const base = fields.slug;
  for (let attempt = 0; attempt < 50; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const doc = new PageModel({
        pageName: fields.pageName,
        slug,
        pageType: fields.pageType ?? 'page',
        isPublished: true,
        isHome: fields.isHome ?? false,
        isGlobal: fields.isGlobal ?? false,
        description: fields.description ?? '',
        component: fields.component,
        createdBy: userId,
        modifications: [{ modifiedBy: userId, modifiedAt: new Date() }],
      });
      await doc.save();
      return doc;
    } catch (err) {
      const e = err as { code?: number; keyPattern?: Record<string, unknown> };
      if (e.code === 11000 && e.keyPattern && 'slug' in e.keyPattern) continue;
      throw err;
    }
  }
  throw new Error(`Could not generate a unique slug for "${base}"`);
}

async function markUserOnboarded(userId: string): Promise<void> {
  try {
    await getUserDbConnection();
    const User = getUserModel();
    await User.findByIdAndUpdate(userId, { $set: { onboardingCompleted: true } }).exec();
  } catch (err) {
    // Non-fatal: the WebsitePreferences record is the secondary gate signal.
    console.warn('Could not set onboardingCompleted on user:', err);
  }
}

export async function generateStarterWebsite(
  input: GenerateInput
): Promise<GenerateResult> {
  const pageDb: Connection = await getPageDbConnection();
  const PageModel = getPageModel(pageDb);
  const Prefs = getWebsitePreferencesModel(pageDb);

  // ---- Idempotency guard: never generate twice for the same user. ----
  const existing = await Prefs.findOne({ userId: input.userId }).exec();
  if (existing && existing.onboardingCompleted && !existing.draft) {
    return {
      homepageSlug: existing.homepageSlug || HOMEPAGE_SLUG,
      pages: (existing.generatedPageSlugs || []).map((s) => ({ name: s, slug: s })),
      themeSlug: existing.theme || '',
      alreadyGenerated: true,
    };
  }

  const businessName = input.businessName.trim() || 'My Business';
  const themeSlug = WIZARD_THEME_TO_SLUG[input.theme as keyof typeof WIZARD_THEME_TO_SLUG] || 'startup';

  // ---- Personalize content + select imagery. ----
  const content = personalizeContent({
    businessName,
    businessCategory: input.businessCategory,
    businessDescription: input.businessDescription,
    targetAudience: input.targetAudience || '',
    location: input.location,
    websiteType: input.websiteType,
  });
  const images = getImagesForBusiness(input.businessCategory, input.websiteType);
  const blockBase = { content, images, businessName, location: input.location };

  // ---- Build header + footer (shared, global layout parts). ----
  const navLinks = getNavLinks(input.websiteType);
  const headerBlocks = getHeaderTemplate(input.headerTemplate)({ businessName, navLinks });
  const footerBlocks = getFooterTemplate(input.footerTemplate)({ businessName, navLinks });

  // ---- Build homepage blocks. ----
  const homepageTypes = getHomepageTemplate(input.websiteType);
  const homepageBlocks = buildBlocks(homepageTypes, blockBase);

  const createdPages: { name: string; slug: string }[] = [];

  // Homepage.
  const homepage = await createPage(PageModel, input.userId, {
    pageName: 'Home',
    slug: HOMEPAGE_SLUG,
    component: homepageBlocks,
    isHome: true,
    description: content.heroSubtitle,
  });
  const homepageSlug = homepage.slug;
  createdPages.push({ name: 'Home', slug: homepageSlug });

  // Header (global layout part).
  await createPage(PageModel, input.userId, {
    pageName: `${businessName} Header`,
    slug: HEADER_SLUG,
    component: headerBlocks,
    pageType: 'header',
    isGlobal: true,
  });

  // Footer (global layout part).
  await createPage(PageModel, input.userId, {
    pageName: `${businessName} Footer`,
    slug: FOOTER_SLUG,
    component: footerBlocks,
    pageType: 'footer',
    isGlobal: true,
  });

  // Supporting pages.
  for (const name of getSupportingPages(input.websiteType)) {
    const blocks = buildBlocks(getPageBlocks(name), blockBase);
    const page = await createPage(PageModel, input.userId, {
      pageName: name,
      slug: slugify(name),
      component: blocks,
      description: `${name} — ${businessName}`,
    });
    createdPages.push({ name, slug: page.slug });
  }

  // ---- Activate the chosen theme. ----
  try {
    await ThemeService.activateBySlug(themeSlug);
  } catch (err) {
    // Non-fatal: the site still renders on the default theme.
    console.warn(`Could not activate theme '${themeSlug}':`, err);
  }

  // ---- Persist preferences + mark onboarding complete. ----
  await Prefs.findOneAndUpdate(
    { userId: input.userId },
    {
      $set: {
        userId: input.userId,
        businessName,
        businessCategory: input.businessCategory,
        businessDescription: input.businessDescription,
        targetAudience: input.targetAudience || '',
        location: input.location || '',
        websiteType: input.websiteType,
        headerTemplate: input.headerTemplate,
        footerTemplate: input.footerTemplate,
        theme: themeSlug,
        onboardingCompleted: true,
        draft: false,
        homepageSlug,
        generatedPageSlugs: createdPages.map((p) => p.slug),
      },
    },
    { upsert: true, new: true }
  ).exec();

  await markUserOnboarded(input.userId);

  return { homepageSlug, pages: createdPages, themeSlug, alreadyGenerated: false };
}
