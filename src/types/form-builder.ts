import type { Document, Types } from 'mongoose';

/**
 * Form Builder plugin — central type definitions.
 *
 * Tenancy note: this repo isolates tenants by *database* (a per-tenant page DB),
 * not by a tenantId column. Every model below still carries an optional
 * `tenantId` derived from the active page-DB name (see resolveTenantId) so the
 * schema nominally matches the plugin spec, but the real isolation boundary is
 * the database connection itself.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export enum FormFieldType {
  Text = 'text',
  Textarea = 'textarea',
  Email = 'email',
  Phone = 'phone',
  Number = 'number',
  Url = 'url',
  Password = 'password',
  Dropdown = 'dropdown',
  Radio = 'radio',
  Checkbox = 'checkbox',
  Date = 'date',
  Time = 'time',
  File = 'file',
  Rating = 'rating',
  Hidden = 'hidden',
  Signature = 'signature',
  SectionHeader = 'section_header',
  Divider = 'divider',
}

export enum FormStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

export type FormFieldTypeValue = `${FormFieldType}`;
export type FormStatusValue = `${FormStatus}`;

export type FieldWidth = '25%' | '50%' | '75%' | '100%';

/* -------------------------------------------------------------------------- */
/* Conditional logic                                                          */
/* -------------------------------------------------------------------------- */

export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'isEmpty'
  | 'isNotEmpty';

export type ConditionalAction = 'show' | 'hide' | 'makeRequired';

export type ConditionalLogicJoin = 'AND' | 'OR';

export interface ConditionalCondition {
  fieldId: string;
  operator: ConditionalOperator;
  value?: string | number | boolean;
}

/** A (possibly nested) group of conditions joined by AND/OR. */
export interface ConditionalGroup {
  join: ConditionalLogicJoin;
  conditions: ConditionalCondition[];
  /** Nested sub-groups, evaluated with the same join semantics. */
  groups?: ConditionalGroup[];
}

export interface ConditionalRule {
  id: string;
  action: ConditionalAction;
  /** Field this rule affects. Defaults to the field the rule is attached to. */
  targetFieldId?: string;
  /** Root condition group for this rule. */
  group: ConditionalGroup;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export type ValidationRuleType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'regex'
  | 'pattern'
  | 'email'
  | 'phone'
  | 'url'
  | 'custom';

export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message?: string;
}

/** Inline validation constraints stored directly on a field. */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  /** A raw regex source string. */
  regex?: string;
  /** A named pattern preset (e.g. 'email', 'phone', 'url', 'alphanumeric'). */
  pattern?: string;
  /** A custom rule description / expression (used by the AI helper). */
  custom?: string;
}

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

export interface FieldOption {
  label: string;
  value: string;
}

export interface IFormField {
  /** Stable uuid, used as the form-data key. */
  id: string;
  type: FormFieldTypeValue;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
  validation?: FieldValidation;
  width?: FieldWidth;
  order: number;
  conditionalRules?: ConditionalRule[];
  /** For dropdown / radio / checkbox. */
  options?: FieldOption[];
  /** 1-based step index for multi-step forms. */
  step?: number;
  /** Optional extra CSS classes applied to the rendered control. */
  cssClass?: string;
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export interface MultiStepSettings {
  enabled: boolean;
  showProgressBar: boolean;
  allowBack: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  adminEmail?: string;
  adminTemplate?: string;
  /** Field id whose value holds the submitter's email (for autoresponders). */
  userEmailField?: string;
  userTemplate?: string;
}

export type WebhookMethod = 'POST' | 'PUT' | 'PATCH';

export interface WebhookSettings {
  enabled: boolean;
  url?: string;
  method: WebhookMethod;
  headers?: Record<string, string>;
  retryCount: number;
}

export interface SpamSettings {
  honeypot: boolean;
  turnstileEnabled: boolean;
  turnstileSiteKey?: string;
  /** Max submissions allowed per IP within the throttle window. */
  throttleLimit: number;
}

export interface FileUploadSettings {
  maxSizeMB: number;
  allowedTypes: string[];
}

export interface IFormSettings {
  submitButtonText: string;
  successMessage: string;
  redirectUrl?: string;
  multiStep: MultiStepSettings;
  notifications: NotificationSettings;
  webhook: WebhookSettings;
  spam: SpamSettings;
  fileUpload: FileUploadSettings;
  /** Local theme overrides; merged over the CMS theme CSS variables. */
  theme: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface AnalyticsTimelinePoint {
  date: string; // YYYY-MM-DD
  views: number;
  starts: number;
  completions: number;
}

export interface FormAnalytics {
  views: number;
  starts: number;
  completions: number;
  conversionRate: number;
  /** fieldId -> number of submissions that abandoned at that field. */
  dropOffByField: Record<string, number>;
  timeline: AnalyticsTimelinePoint[];
}

/** Shape returned by AnalyticsService.getAnalytics / the analytics route. */
export interface AnalyticsSummary {
  formId: string;
  range: { startDate: string; endDate: string };
  views: number;
  starts: number;
  completions: number;
  conversionRate: number;
  dropOffByField: Array<{ fieldId: string; label: string; count: number }>;
  timeline: AnalyticsTimelinePoint[];
}

/* -------------------------------------------------------------------------- */
/* Versioning                                                                 */
/* -------------------------------------------------------------------------- */

export interface IFormVersion {
  _id?: string;
  tenantId?: string;
  formId: string;
  version: number;
  /** Full snapshot of the form document at this version. */
  snapshot: IForm;
  createdBy?: string;
  createdAt?: string;
}

/** Compact version-history entry embedded on the Form document. */
export interface FormVersionEntry {
  version: number;
  createdBy?: string;
  createdAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Form                                                                       */
/* -------------------------------------------------------------------------- */

export interface IForm {
  _id?: string;
  tenantId?: string;
  name: string;
  slug: string;
  description?: string;
  status: FormStatusValue;
  fields: IFormField[];
  settings: IFormSettings;
  analytics: FormAnalytics;
  versions: FormVersionEntry[];
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

export type WebhookStatus = 'pending' | 'sent' | 'failed';

export interface SubmissionMeta {
  ipAddress?: string;
  userAgent?: string;
  sourcePage?: string;
}

export interface WebhookAttempt {
  status: WebhookStatus;
  statusCode?: number;
  response?: string;
  at: string;
}

export interface ISubmission {
  _id?: string;
  tenantId?: string;
  formId: string;
  /** Stored as a Mongo Map; surfaced to TS as a plain record. */
  submissionData: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  sourcePage?: string;
  webhookStatus: WebhookStatus;
  webhookAttempts?: WebhookAttempt[];
  createdAt?: string;
}

/* -------------------------------------------------------------------------- */
/* AI helpers                                                                 */
/* -------------------------------------------------------------------------- */

export interface FormOptimizationSuggestion {
  type: string;
  field?: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

/* -------------------------------------------------------------------------- */
/* Mongoose document types                                                    */
/* -------------------------------------------------------------------------- */

export interface IFormDocument
  extends Omit<IForm, '_id' | 'createdBy' | 'updatedBy'>,
    Document {
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export interface ISubmissionDocument
  extends Omit<ISubmission, '_id' | 'formId' | 'submissionData'>,
    Document {
  formId: Types.ObjectId;
  submissionData: Map<string, unknown>;
}

export interface IFormVersionDocument
  extends Omit<IFormVersion, '_id' | 'formId' | 'createdBy'>,
    Document {
  formId: Types.ObjectId;
  createdBy?: Types.ObjectId;
}
