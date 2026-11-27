import { Schema, model, models } from 'mongoose';

export interface IExtensionMigrationDocument {
  extensionId: string;
  migration: string;
  version: string;
  executedAt: Date;
}

const ExtensionMigrationSchema = new Schema<IExtensionMigrationDocument>(
  {
    extensionId: { type: String, required: true, index: true },
    migration: { type: String, required: true },
    version: { type: String, required: true },
    executedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'extension_migrations' }
);

ExtensionMigrationSchema.index({ extensionId: 1, migration: 1 }, { unique: true });

const ExtensionMigrationModel =
  models.ExtensionMigration ||
  model<IExtensionMigrationDocument>('ExtensionMigration', ExtensionMigrationSchema);

export default ExtensionMigrationModel;
export { ExtensionMigrationSchema };
