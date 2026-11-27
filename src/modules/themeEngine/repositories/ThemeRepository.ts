import type { ClientSession, Types } from 'mongoose';
import { UPLOADED_THEMES_REL } from '@/lib/dynamicContent';
import { getPageDbConnection } from '@/utils/db';
import { getEngineThemeModel, type IThemeEngineThemeDocument } from '../models/Theme';
import { getEngineThemeSettingsModel, SINGLETON_ID, type IThemeEngineSettingsDocument } from '../models/ThemeSettings';
import type { ThemeInstallLogEntry, ThemeManifest, ThemeStatus, ThemeTemplateMeta } from '../types';
import { extractTemplateMetadata } from '../templateMetadata';

/**
 * ThemeRepository — the ONLY place that talks to Mongoose for `themes` /
 * `theme_settings` documents (spec §4.4: "the only module that talks to
 * MongoDB for theme metadata and active-theme state"). `ThemeRegistry` and
 * `ThemeInstaller`'s failure bookkeeping are the sole callers; nothing else in
 * the engine imports the models directly.
 */

async function models() {
  const conn = await getPageDbConnection();
  return { conn, ThemeModel: getEngineThemeModel(conn), SettingsModel: getEngineThemeSettingsModel(conn) };
}

export interface RegisterInstalledInput {
  manifest: ThemeManifest;
  installPath: string;
  checksum: string;
  installedBy: Types.ObjectId | string;
  installLog: ThemeInstallLogEntry[];
  assetHashes?: { stylesheet?: string; script?: string };
  assetPaths?: { stylesheet?: string; script?: string };
}

export const themeRepository = {
  async findBySlug(slug: string, session?: ClientSession): Promise<IThemeEngineThemeDocument | null> {
    const { ThemeModel } = await models();
    return ThemeModel.findOne({ slug }, null, session ? { session } : {}).exec();
  },

  async list(): Promise<IThemeEngineThemeDocument[]> {
    const { ThemeModel } = await models();
    return ThemeModel.find({}).sort({ name: 1 }).exec();
  },

  /** Upsert-by-slug as `status: 'installed'` — used by the success path only. */
  async upsertInstalled(input: RegisterInstalledInput): Promise<IThemeEngineThemeDocument> {
    const { ThemeModel } = await models();
    const { manifest } = input;
    const templatesMeta = extractTemplateMetadata(manifest);
    const partials: Record<string, string> = {};
    for (const [key, value] of Object.entries(manifest.partials ?? {})) {
      if (typeof value === 'string') partials[key] = value;
    }
    const doc = await ThemeModel.findOneAndUpdate(
      { slug: manifest.slug },
      {
        $set: {
          slug: manifest.slug,
          name: manifest.name,
          author: manifest.author,
          version: manifest.version,
          description: manifest.description,
          compatibleCmsVersion: manifest.compatibleCmsVersion,
          status: 'installed' as ThemeStatus,
          manifest,
          installPath: input.installPath,
          checksum: input.checksum,
          installedAt: new Date(),
          installedBy: input.installedBy,
          installLog: input.installLog,
          assetHashes: input.assetHashes ?? {},
          assetPaths: input.assetPaths ?? {},
          templates: templatesMeta,
          partials,
          assets: {
            css: input.assetPaths?.stylesheet ?? 'assets/style.css',
            js: input.assetPaths?.script ?? 'assets/theme.js',
          },
        },
      },
      { upsert: true, new: true }
    ).exec();
    return doc as IThemeEngineThemeDocument;
  },

  /** Record a `status: 'failed'` bookkeeping row, but ONLY for a brand-new slug. */
  async upsertFailedIfNew(input: {
    slug: string;
    checksum: string;
    installedBy: Types.ObjectId | string;
    installLog: ThemeInstallLogEntry[];
  }): Promise<void> {
    const { ThemeModel } = await models();
    const existing = await ThemeModel.findOne({ slug: input.slug }).exec();
    if (existing) return; // never clobber an existing install/attempt with this failure.

    await ThemeModel.create({
      slug: input.slug,
      name: input.slug,
      author: 'unknown',
      version: '0.0.0',
      compatibleCmsVersion: '*',
      status: 'failed' as ThemeStatus,
      manifest: {
        name: input.slug,
        slug: input.slug,
        author: 'unknown',
        version: '0.0.0',
        compatibleCmsVersion: '*',
        templates: { index: '' },
        partials: {},
        menus: [],
        widgetAreas: [],
        themeSettings: [],
        supportedFeatures: [],
      },
      installPath: `${UPLOADED_THEMES_REL}/${input.slug}`,
      checksum: input.checksum,
      installedAt: new Date(),
      installedBy: input.installedBy,
      installLog: input.installLog,
    });
  },

  async remove(slug: string): Promise<void> {
    const { ThemeModel } = await models();
    await ThemeModel.deleteOne({ slug }).exec();
  },

  /** Provide a session for the transactional activate() (spec §4.4). */
  async withSession<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const { conn } = await models();
    const session = await conn.startSession();
    try {
      let out!: T;
      await session.withTransaction(async () => {
        out = await fn(session);
      });
      return out;
    } finally {
      await session.endSession();
    }
  },

  /** Read the singleton, creating it with defaults if this tenant has none yet. */
  async getSettings(session?: ClientSession): Promise<IThemeEngineSettingsDocument> {
    const { SettingsModel } = await models();
    const doc = await SettingsModel.findOneAndUpdate(
      { _id: SINGLETON_ID },
      { $setOnInsert: { _id: SINGLETON_ID } },
      { upsert: true, new: true, session }
    ).exec();
    return doc as IThemeEngineSettingsDocument;
  },

  /** Steps 2-3 of spec §4.4 activate(), atomically: roll `activeThemeSlug` -> `previousThemeSlug`, set the new one. */
  async setActiveSlug(slug: string, activatedBy: Types.ObjectId | string, session: ClientSession): Promise<void> {
    const { SettingsModel } = await models();
    const current = await this.getSettings(session);
    await SettingsModel.updateOne(
      { _id: SINGLETON_ID },
      {
        $set: {
          activeThemeSlug: slug,
          previousThemeSlug: current.activeThemeSlug,
          activatedAt: new Date(),
          activatedBy,
        },
      },
      { session }
    ).exec();
  },

  async clearActiveSlug(activatedBy: Types.ObjectId | string | null, session: ClientSession): Promise<void> {
    const { SettingsModel } = await models();
    const current = await this.getSettings(session);
    await SettingsModel.updateOne(
      { _id: SINGLETON_ID },
      {
        $set: {
          activeThemeSlug: null,
          previousThemeSlug: current.activeThemeSlug,
          activatedAt: new Date(),
          activatedBy,
        },
      },
      { session }
    ).exec();
  },

  /** Roll back to the previous active theme slug (stored during last activation). */
  async rollbackToPrevious(activatedBy: Types.ObjectId | string, session: ClientSession): Promise<string> {
    const { SettingsModel } = await models();
    const current = await this.getSettings(session);
    const previous = current.previousThemeSlug;
    if (!previous) {
      throw new Error('No previous theme available for rollback.');
    }
    const theme = await this.findBySlug(previous, session);
    if (!theme || theme.status !== 'installed') {
      throw new Error(`Previous theme "${previous}" is not available for rollback.`);
    }
    await SettingsModel.updateOne(
      { _id: SINGLETON_ID },
      {
        $set: {
          activeThemeSlug: previous,
          previousThemeSlug: current.activeThemeSlug,
          activatedAt: new Date(),
          activatedBy,
        },
      },
      { session }
    ).exec();
    return previous;
  },

  async setHomepageTemplateKey(key: string | null): Promise<void> {
    const { SettingsModel } = await models();
    await SettingsModel.updateOne(
      { _id: SINGLETON_ID },
      { $set: { homepageTemplateKey: key } },
      { upsert: true }
    ).exec();
  },
};
