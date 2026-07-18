import { Schema, model, models, type Document } from 'mongoose';

export interface IPluginData {
  pluginId: string;
  key: string;
  data: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPluginDataDocument extends IPluginData, Document {}

export const PluginDataSchema = new Schema<IPluginDataDocument>(
  {
    pluginId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PluginDataSchema.index({ pluginId: 1, key: 1 }, { unique: true });

const PluginDataModel =
  models.PluginData || model<IPluginDataDocument>('PluginData', PluginDataSchema);

export default PluginDataModel;
