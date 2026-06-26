import { Schema, model, models } from 'mongoose';
import type { ISubmissionDocument } from '@/types/form-builder';

/**
 * Form submission. Lives in the per-tenant page DB. `submissionData` is a Map
 * so arbitrary, schema-less field values can be stored without losing typing at
 * the Mongoose layer. `tenantId` (page-DB name) is stored for traceability.
 */

const WebhookAttemptSchema = new Schema(
  {
    status: { type: String, enum: ['pending', 'sent', 'failed'], required: true },
    statusCode: { type: Number },
    response: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FormSubmissionSchema = new Schema<ISubmissionDocument>(
  {
    tenantId: { type: String, index: true },
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
    submissionData: { type: Map, of: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    sourcePage: { type: String },
    webhookStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    webhookAttempts: { type: [WebhookAttemptSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FormSubmissionSchema.index({ formId: 1, createdAt: -1 });

const FormSubmissionModel =
  models.FormSubmission || model<ISubmissionDocument>('FormSubmission', FormSubmissionSchema);

export default FormSubmissionModel;
export { FormSubmissionSchema };
