import { Schema, model, models } from 'mongoose';
import type { StoredExtension } from '@/lib/extensions/types';

const HistorySchema = new Schema(
  {
    at: { type: Date, required: true },
    action: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    version: { type: String },
    message: { type: String },
    actorId: { type: String },
  },
  { _id: false }
);

const PluginExtensionSchema = new Schema(
  {
    extensionId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    version: { type: String, required: true },
    targetPluginId: { type: String, required: true, index: true },
    publisher: {
      name: { type: String },
      url: { type: String },
    },
    manifest: { type: Schema.Types.Mixed, required: true },
    checksum: { type: String, required: true },
    storageRef: { type: String, default: '' },
    status: {
      type: String,
      enum: ['installed', 'enabled', 'disabled', 'failed', 'uninstalled'],
      required: true,
      index: true,
    },
    sdkCompatibility: { type: String, default: '' },
    dependencies: {
      type: [{ id: { type: String }, version: { type: String } }],
      default: [],
    },
    requestedPermissions: { type: [String], default: [] },
    approvedPermissions: { type: [String], default: [] },
    trustedExecution: {
      type: String,
      enum: ['pending', 'approved', 'denied'],
      default: 'pending',
    },
    trustedExecutionBy: { type: String },
    trustedExecutionAt: { type: Date },
    installedAt: { type: Date },
    enabledAt: { type: Date },
    lastError: { type: String },
    health: {
      type: String,
      enum: ['unknown', 'healthy', 'degraded', 'error'],
      default: 'unknown',
    },
    history: { type: [HistorySchema], default: [] },
    previousVersion: { type: String },
    previousChecksum: { type: String },
    migrationStatus: {
      type: String,
      enum: ['none', 'pending', 'applied', 'failed'],
      default: 'none',
    },
    migrationError: { type: String },
    lockOwner: { type: String },
    lockExpiresAt: { type: Date },
  },
  { timestamps: true, collection: 'plugin_extensions' }
);

PluginExtensionSchema.index({ targetPluginId: 1, status: 1 });
PluginExtensionSchema.index({ lockExpiresAt: 1 });

const PluginExtensionModel =
  models.PluginExtension || model<StoredExtension>('PluginExtension', PluginExtensionSchema);

export default PluginExtensionModel;
export { PluginExtensionSchema };
