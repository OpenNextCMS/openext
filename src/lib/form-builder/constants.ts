import type {
  IFormSettings,
  FormAnalytics,
  FormFieldTypeValue,
} from '@/types/form-builder';

/**
 * Plugin identity. We standardize on this pluginId in the existing `Plugin`
 * collection; the lifecycle gate also tolerates marketplace-install variants
 * (e.g. type "form") so an install via the existing marketplace UI still
 * activates the plugin. Mirrors the Menu Redirect plugin's approach.
 */
export const FORM_BUILDER_PLUGIN_KEY = 'form-builder';
export const FORM_BUILDER_PLUGIN_ID = 'form-builder';
export const FORM_BUILDER_VERSION = '1.0.0';

export const FORM_BUILDER_PLUGIN_DEFAULTS = {
  name: 'Form Builder',
  description:
    'Drag-and-drop form builder with validation, conditional logic, submissions, webhooks, email notifications and analytics.',
  author: 'OpenNext',
  type: 'form',
  icon: 'FileInput',
};

/** Named RBAC permissions the plugin exposes (mapped onto the role tiers). */
export const FORM_PERMISSIONS = [
  'forms.view',
  'forms.create',
  'forms.edit',
  'forms.delete',
  'forms.publish',
  'forms.submissions.view',
  'forms.analytics.view',
] as const;

export type FormPermission = (typeof FORM_PERMISSIONS)[number];

/** Window (ms) used by the per-IP submission throttle. */
export const SUBMISSION_THROTTLE_WINDOW_MS = 60_000;

/** Cap on how many version snapshots we keep in the embedded history mirror. */
export const MAX_EMBEDDED_VERSIONS = 20;

export const DEFAULT_FORM_SETTINGS: IFormSettings = {
  submitButtonText: 'Submit',
  successMessage: 'Thanks! Your response has been recorded.',
  redirectUrl: '',
  multiStep: { enabled: false, showProgressBar: true, allowBack: true },
  notifications: {
    enabled: false,
    adminEmail: '',
    adminTemplate: '',
    userEmailField: '',
    userTemplate: '',
  },
  webhook: { enabled: false, url: '', method: 'POST', headers: {}, retryCount: 3 },
  spam: { honeypot: true, turnstileEnabled: false, turnstileSiteKey: '', throttleLimit: 5 },
  fileUpload: { maxSizeMB: 5, allowedTypes: ['image/png', 'image/jpeg', 'application/pdf'] },
  theme: {},
};

export const DEFAULT_FORM_ANALYTICS: FormAnalytics = {
  views: 0,
  starts: 0,
  completions: 0,
  conversionRate: 0,
  dropOffByField: {},
  timeline: [],
};

/** Field types that never collect a value (purely structural / layout). */
export const NON_INPUT_FIELD_TYPES: FormFieldTypeValue[] = [
  'section_header',
  'divider',
];

/** Honeypot input name; must stay constant between renderer and submit route. */
export const HONEYPOT_FIELD_NAME = '_hpot';
