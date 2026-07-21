import { getPageDbConnection, getThemeModel } from '@/utils/db';
import type { ITheme } from '@/types/theme';

/**
 * ThemeRepository — data-access boundary for Theme Package Manager.
 * All queries run against the per-tenant page DB.
 */

function toPlain(doc: unknown): ITheme & { _id: string } {
  const d = doc as ITheme & { _id: unknown };
  return { ...d, _id: String(d._id) };
}

export const ThemeRepository = {
  async findAll(): Promise<(ITheme & { _id: string })[]> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const docs = await Theme.find({})
      .sort({ isSystemTheme: -1, isPackageTheme: -1, updatedAt: -1 })
      .lean()
      .exec();
    return docs.map(toPlain);
  },

  async findById(id: string): Promise<(ITheme & { _id: string }) | null> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = await Theme.findById(id).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async findBySlug(slug: string): Promise<(ITheme & { _id: string }) | null> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = await Theme.findOne({ slug: slug.toLowerCase() }).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async existsBySlug(slug: string): Promise<boolean> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const count = await Theme.countDocuments({ slug: slug.toLowerCase() }).exec();
    return count > 0;
  },

  async create(data: Partial<ITheme> & { name: string; slug: string }): Promise<ITheme & { _id: string }> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const created = await Theme.create(data);
    return toPlain(created.toObject());
  },

  async updateById(
    id: string,
    patch: Record<string, unknown>
  ): Promise<(ITheme & { _id: string }) | null> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = await Theme.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean().exec();
    return doc ? toPlain(doc) : null;
  },

  async getDocument(id: string) {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    return Theme.findById(id).exec();
  },

  async deactivateAllExcept(id: string): Promise<void> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    await Theme.updateMany({ _id: { $ne: id } }, { $set: { isActive: false } }).exec();
  },

  async deleteById(id: string): Promise<void> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    await Theme.findByIdAndDelete(id).exec();
  },

  async findActive(): Promise<(ITheme & { _id: string }) | null> {
    const pageDb = await getPageDbConnection();
    const Theme = getThemeModel(pageDb);
    const doc = await Theme.findOne({ isActive: true }).lean().exec();
    return doc ? toPlain(doc) : null;
  },
};
