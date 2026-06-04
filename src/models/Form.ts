import { Schema, model, models } from 'mongoose';
import type { IFormDocument } from '@/types/form-builder';
import { FormFieldType, FormStatus } from '@/types/form-builder';

/**
 * Form model. Lives in the per-tenant *page* DB alongside Pages/Blogs, so a
 * form's slug only needs to be unique within this collection (tenancy is by
 * database). A nullable `tenantId` (the page-DB name) is stored for traceability.
 */

const FieldValidationSchema = new Schema(
  {
    minLength: { type: Number },
    maxLength: { type: Number },
    regex: { type: String },
    pattern: { type: String },
    custom: { type: String },
  },
  { _id: false }
);

const FieldOptionSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const FormFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: Object.values(FormFieldType), required: true },
    label: { type: String, required: true },
    placeholder: { type: String },
    helpText: { type: String },
    required: { type: Boolean, default: false },
    defaultValue: { type: Schema.Types.Mixed, default: null },
    validation: { type: FieldValidationSchema, default: () => ({}) },
    width: { type: String, enum: ['25%', '50%', '75%', '100%'], default: '100%' },
    order: { type: Number, required: true, default: 0 },
    // Conditional rules carry nested AND/OR groups; keep flexible as Mixed.
    conditionalRules: { type: [Schema.Types.Mixed], default: [] },
    options: { type: [FieldOptionSchema], default: undefined },
    step: { type: Number, default: 1 },
    cssClass: { type: String },
  },
  { _id: false }
);

const FormSettingsSchema = new Schema(
  {
    submitButtonText: { type: String, default: 'Submit' },
    successMessage: { type: String, default: 'Thanks! Your response has been recorded.' },
    redirectUrl: { type: String, default: '' },
    multiStep: {
      enabled: { type: Boolean, default: false },
      showProgressBar: { type: Boolean, default: true },
      allowBack: { type: Boolean, default: true },
    },
    notifications: {
      enabled: { type: Boolean, default: false },
      adminEmail: { type: String, default: '' },
      adminTemplate: { type: String, default: '' },
      userEmailField: { type: String, default: '' },
      userTemplate: { type: String, default: '' },
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: '' },
      method: { type: String, enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
      headers: { type: Schema.Types.Mixed, default: {} },
      retryCount: { type: Number, default: 3 },
    },
    spam: {
      honeypot: { type: Boolean, default: true },
      turnstileEnabled: { type: Boolean, default: false },
      turnstileSiteKey: { type: String, default: '' },
      throttleLimit: { type: Number, default: 5 },
    },
    fileUpload: {
      maxSizeMB: { type: Number, default: 5 },
      allowedTypes: { type: [String], default: ['image/png', 'image/jpeg', 'application/pdf'] },
    },
    theme: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const AnalyticsTimelinePointSchema = new Schema(
  {
    date: { type: String, required: true },
    views: { type: Number, default: 0 },
    starts: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
  },
  { _id: false }
);

const FormAnalyticsSchema = new Schema(
  {
    views: { type: Number, default: 0 },
    starts: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    dropOffByField: { type: Schema.Types.Mixed, default: {} },
    timeline: { type: [AnalyticsTimelinePointSchema], default: [] },
  },
  { _id: false }
);

const FormVersionEntrySchema = new Schema(
  {
    version: { type: Number, required: true },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const FormSchema = new Schema<IFormDocument>(
  {
    tenantId: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String },
    status: {
      type: String,
      enum: Object.values(FormStatus),
      default: FormStatus.Draft,
      index: true,
    },
    fields: { type: [FormFieldSchema], default: [] },
    settings: { type: FormSettingsSchema, default: () => ({}) },
    analytics: { type: FormAnalyticsSchema, default: () => ({}) },
    versions: { type: [FormVersionEntrySchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Slug is unique per tenant database (tenancy = separate DB).
FormSchema.index({ slug: 1 }, { unique: true });
FormSchema.index({ status: 1, updatedAt: -1 });

const FormModel = models.Form || model<IFormDocument>('Form', FormSchema);

export default FormModel;
export { FormSchema };
