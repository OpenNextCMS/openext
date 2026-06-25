import { Schema, model, models } from 'mongoose';
import { IPluginDocument } from '@/types/index';

const PluginSchema = new Schema<IPluginDocument>(
  {
    pluginId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    version: { type: String, required: true },
    description: { type: String },
    author: { type: String },
    type: { type: String },
    isActive: { type: Boolean, default: false },
    icon: { type: String },
    entryPoint: { type: String },
    hasUpdate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PluginModel = models.Plugin || model<IPluginDocument>('Plugin', PluginSchema);

export default PluginModel;
export { PluginSchema };
