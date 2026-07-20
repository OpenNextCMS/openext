import type { ClientSession } from 'mongoose';
import { getPageDbConnection } from '@/utils/db';
import {
  getInstalledThemeModel,
  type IInstalledTheme,
  type IInstalledThemeDocument,
} from '../models/InstalledTheme';

/**
 * ThemeRepository — the ONLY place that talks to Mongoose for installed themes
 * (SOLID/DIP: services depend on this boundary, not on the ODM). Every method
 * resolves the per-tenant page-DB connection lazily.
 */

export type InstalledThemeRecord = IInstalledTheme & { _id: string };

function toPlain(doc: unknown): InstalledThemeRecord {
  const d = doc as IInstalledTheme & { _id: unknown };
  return { ...d, _id: String(d._id) };
}

async function model() {
  const conn = await getPageDbConnection();
  return { conn, Model: getInstalledThemeModel(conn) };
}

export const ThemeRepository = {
  async findAll(): Promise<InstalledThemeRecord[]> {
    const { Model } = await model();
    const docs = await Model.find({}).sort({ active: -1, updatedAt: -1 }).lean().exec();
    return docs.map(toPlain);
  },

  async findBySlug(slug: string): Promise<InstalledThemeRecord | null> {
    const { Model } = await model();
    const doc = await Model.findOne({ slug: slug.toLowerCase() }).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async findActive(): Promise<InstalledThemeRecord | null> {
    const { Model } = await model();
    const doc = await Model.findOne({ active: true }).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async existsBySlug(slug: string): Promise<boolean> {
    const { Model } = await model();
    const count = await Model.countDocuments({ slug: slug.toLowerCase() }).exec();
    return count > 0;
  },

  async create(data: Partial<IInstalledTheme> & { name: string; slug: string; version: string; path: string }): Promise<InstalledThemeRecord> {
    const { Model } = await model();
    const created = await Model.create({ ...data, slug: data.slug.toLowerCase() });
    return toPlain(created.toObject());
  },

  async updateBySlug(slug: string, patch: Partial<IInstalledTheme>): Promise<InstalledThemeRecord | null> {
    const { Model } = await model();
    const doc = await Model.findOneAndUpdate({ slug: slug.toLowerCase() }, { $set: patch }, { new: true })
      .lean()
      .exec();
    return doc ? toPlain(doc) : null;
  },

  async deleteBySlug(slug: string): Promise<boolean> {
    const { Model } = await model();
    const res = await Model.deleteOne({ slug: slug.toLowerCase() }).exec();
    return res.deletedCount === 1;
  },

  /** Provide a session for the single-active activation transaction (§6). */
  async withSession<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const { conn } = await model();
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

  /** Set `active` on exactly one slug, clearing all others. Uses `session` when given. */
  async setActiveExclusive(slug: string, session?: ClientSession): Promise<void> {
    const { Model } = await model();
    // Order matters w/ the partial-unique index: clear current active first…
    await Model.updateMany({ active: true, slug: { $ne: slug.toLowerCase() } }, { $set: { active: false } }, session ? { session } : {}).exec();
    // …then activate the target.
    await Model.updateOne({ slug: slug.toLowerCase() }, { $set: { active: true } }, session ? { session } : {}).exec();
  },

  async deactivateAll(session?: ClientSession): Promise<void> {
    const { Model } = await model();
    await Model.updateMany({ active: true }, { $set: { active: false } }, session ? { session } : {}).exec();
  },

  /** Raw document (for methods needing a mutable Mongoose doc). */
  async getDocument(slug: string): Promise<IInstalledThemeDocument | null> {
    const { Model } = await model();
    return Model.findOne({ slug: slug.toLowerCase() }).exec();
  },
};
