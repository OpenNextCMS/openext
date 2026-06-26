import { getPageDbConnection, getFormSubmissionModel } from '@/utils/db';
import type { IForm, ISubmission, SubmissionMeta } from '@/types/form-builder';
import { buildZodSchema, validateSubmission as runZodValidation } from '../validation';
import { evaluateConditions } from '../conditionalLogic';
import { HONEYPOT_FIELD_NAME, SUBMISSION_THROTTLE_WINDOW_MS } from '../constants';

/**
 * SubmissionService — validation, spam detection and persistence of form
 * submissions. All queries scoped to the per-tenant page DB.
 */

export interface ValidateResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const SubmissionService = {
  /**
   * Validate raw submission data against the form's field schema, honoring
   * conditional logic (hidden fields are not required/validated).
   */
  validateSubmission(form: IForm, data: Record<string, unknown>): ValidateResult {
    const conditionState = evaluateConditions(form.fields, data);

    // Only validate fields that are currently visible. For hidden fields, drop
    // their `required` so the Zod schema doesn't reject an intentionally-absent
    // value; for visible makeRequired fields, force required on.
    const effectiveFields = form.fields
      .filter((f) => conditionState[f.id]?.visible !== false)
      .map((f) => ({ ...f, required: !!conditionState[f.id]?.required }));

    const schema = buildZodSchema(effectiveFields);
    const result = runZodValidation(schema, data);
    return { valid: result.valid, errors: result.errors };
  },

  /**
   * Spam heuristics: honeypot must be empty; throttle handled by the caller
   * (needs the DB + IP). Returns true when the submission looks like spam.
   */
  detectSpam(data: Record<string, unknown>, settings: IForm['settings']): boolean {
    if (settings.spam?.honeypot) {
      const trap = data[HONEYPOT_FIELD_NAME];
      if (typeof trap === 'string' && trap.trim().length > 0) return true;
    }
    return false;
  },

  /** Per-IP throttle check against recent submissions in the time window. */
  async isThrottled(
    tenantId: string,
    formId: string,
    ipAddress: string | undefined,
    limit: number
  ): Promise<boolean> {
    if (!ipAddress || limit <= 0) return false;
    const pageDb = await getPageDbConnection();
    const Submission = getFormSubmissionModel(pageDb);
    const since = new Date(Date.now() - SUBMISSION_THROTTLE_WINDOW_MS);
    const recent = await Submission.countDocuments({
      tenantId,
      formId,
      ipAddress,
      createdAt: { $gte: since },
    });
    return recent >= limit;
  },

  async createSubmission(
    tenantId: string,
    formId: string,
    data: Record<string, unknown>,
    meta: SubmissionMeta
  ): Promise<ISubmission> {
    const pageDb = await getPageDbConnection();
    const Submission = getFormSubmissionModel(pageDb);

    // Strip the honeypot before persisting.
    const clean: Record<string, unknown> = { ...data };
    delete clean[HONEYPOT_FIELD_NAME];

    const created = await Submission.create({
      tenantId,
      formId,
      submissionData: clean,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      sourcePage: meta.sourcePage,
      webhookStatus: 'pending',
      webhookAttempts: [],
    });

    return mapSubmission(created.toObject());
  },

  async getSubmissions(
    tenantId: string,
    formId: string,
    pagination: { page: number; limit: number; startDate?: string; endDate?: string }
  ): Promise<{ submissions: ISubmission[]; total: number }> {
    const pageDb = await getPageDbConnection();
    const Submission = getFormSubmissionModel(pageDb);

    const query: Record<string, unknown> = { tenantId, formId };
    if (pagination.startDate || pagination.endDate) {
      const createdAt: Record<string, Date> = {};
      if (pagination.startDate) createdAt.$gte = new Date(pagination.startDate);
      if (pagination.endDate) createdAt.$lte = new Date(pagination.endDate);
      query.createdAt = createdAt;
    }

    const skip = (pagination.page - 1) * pagination.limit;
    const [items, total] = await Promise.all([
      Submission.find(query).sort('-createdAt').skip(skip).limit(pagination.limit).lean().exec(),
      Submission.countDocuments(query),
    ]);

    return { submissions: (items as unknown[]).map(mapSubmission), total };
  },
};

/** Normalize a Mongo doc (Map submissionData) into the plain ISubmission shape. */
function mapSubmission(doc: unknown): ISubmission {
  const d = doc as Record<string, unknown>;
  const raw = d.submissionData;
  let submissionData: Record<string, unknown> = {};
  if (raw instanceof Map) {
    submissionData = Object.fromEntries(raw);
  } else if (raw && typeof raw === 'object') {
    submissionData = raw as Record<string, unknown>;
  }
  return { ...(d as object), submissionData } as ISubmission;
}

export type SubmissionServiceType = typeof SubmissionService;
