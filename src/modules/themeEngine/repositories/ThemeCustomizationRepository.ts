import type { Types } from 'mongoose';
import { getPageDbConnection } from '@/utils/db';
import {
  getEngineThemeCustomizationModel,
  type IThemeEngineCustomizationDocument,
} from '../models/ThemeCustomization';

async function model() {
  const conn = await getPageDbConnection();
  return getEngineThemeCustomizationModel(conn);
}

export const themeCustomizationRepository = {
  async get(themeSlug: string): Promise<Record<string, unknown>> {
    const CustomizationModel = await model();
    const doc = await CustomizationModel.findOne({ themeSlug }).lean().exec();
    return (doc?.values as Record<string, unknown>) ?? {};
  },

  async save(
    themeSlug: string,
    values: Record<string, unknown>,
    updatedBy?: Types.ObjectId | string
  ): Promise<IThemeEngineCustomizationDocument> {
    const CustomizationModel = await model();
    const doc = await CustomizationModel.findOneAndUpdate(
      { themeSlug },
      {
        $set: {
          themeSlug,
          values,
          ...(updatedBy ? { updatedBy } : {}),
        },
      },
      { upsert: true, new: true }
    ).exec();
    return doc as IThemeEngineCustomizationDocument;
  },

  async remove(themeSlug: string): Promise<void> {
    const CustomizationModel = await model();
    await CustomizationModel.deleteOne({ themeSlug }).exec();
  },
};
