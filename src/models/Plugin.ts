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
    kind: { type: String, enum: ['block', 'system'], default: 'block' },
    isActive: { type: Boolean, default: false },
    icon: { type: String },
    entryPoint: { type: String },
    adminEntry: { type: String },
    blockEntry: { type: String },
    customElement: { type: String },
    styles: { type: [String], default: [] },
    source: { type: String, enum: ['uploaded', 'marketplace', 'builtin'], default: 'marketplace' },
    hasUpdate: { type: Boolean, default: false },
    hasBackend: { type: Boolean, default: false },
    serverEntry: { type: String },
    apiPrefix: { type: String },
    permissions: { type: [String], default: [] },
    dependencies: { type: [String], default: [] },
    installHook: { type: String },
    uninstallHook: { type: String },
    loadedAt: { type: Date },
    loadError: { type: String },
  },
  { timestamps: true }
);

const PluginModel = models.Plugin || model<IPluginDocument>('Plugin', PluginSchema);

export default PluginModel;
export { PluginSchema };
