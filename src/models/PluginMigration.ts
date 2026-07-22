import { Schema, model, models } from 'mongoose';

export interface IPluginMigrationDocument {
  plugin: string;
  migration: string;
  executedAt: Date;
}

const PluginMigrationSchema = new Schema<IPluginMigrationDocument>(
  {
    plugin: { type: String, required: true, index: true },
    migration: { type: String, required: true },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

PluginMigrationSchema.index({ plugin: 1, migration: 1 }, { unique: true });

const PluginMigrationModel =
  models.PluginMigration ||
  model<IPluginMigrationDocument>('PluginMigration', PluginMigrationSchema);

export default PluginMigrationModel;
export { PluginMigrationSchema };
