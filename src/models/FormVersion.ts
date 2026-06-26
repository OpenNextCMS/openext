import { Schema, model, models } from 'mongoose';
import type { IFormVersionDocument } from '@/types/form-builder';

/**
 * Full form-version snapshots. A new document is written before every update
 * (see FormService.createVersion), giving a queryable, restorable history that
 * complements the compact `versions[]` mirror embedded on the Form itself.
 */
const FormVersionSchema = new Schema<IFormVersionDocument>(
  {
    tenantId: { type: String, index: true },
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
    version: { type: Number, required: true },
    // Full form snapshot; flexible shape, so stored as Mixed.
    snapshot: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FormVersionSchema.index({ formId: 1, version: -1 });

const FormVersionModel =
  models.FormVersion || model<IFormVersionDocument>('FormVersion', FormVersionSchema);

export default FormVersionModel;
export { FormVersionSchema };
