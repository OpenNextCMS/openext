import { getPageDbConnection, getFormSubmissionModel, getFormModel } from '@/utils/db';
import type { IForm, ISubmission, WebhookStatus } from '@/types/form-builder';
import { resolveTenantId } from '../tenant';

/**
 * WebhookService — fire-and-retry outbound webhooks on submission. Each attempt
 * is logged on the submission document. Designed to be awaited in a background
 * (non-blocking) task from the submit route.
 */

const RETRY_BASE_DELAY_MS = 500;

async function postOnce(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown
): Promise<{ ok: boolean; statusCode?: number; response?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, statusCode: res.status, response: text.slice(0, 1000) };
  } catch (err) {
    return { ok: false, response: (err as Error).message };
  }
}

export const WebhookService = {
  async logAttempt(
    submissionId: string,
    status: WebhookStatus,
    response?: { statusCode?: number; response?: string }
  ): Promise<void> {
    try {
      const pageDb = await getPageDbConnection();
      const Submission = getFormSubmissionModel(pageDb);
      await Submission.updateOne(
        { _id: submissionId },
        {
          $set: { webhookStatus: status },
          $push: {
            webhookAttempts: {
              status,
              statusCode: response?.statusCode,
              response: response?.response,
              at: new Date(),
            },
          },
        }
      );
    } catch (err) {
      console.error('[form-builder] webhook logAttempt failed:', err);
    }
  },

  async triggerWebhook(form: IForm, submission: ISubmission): Promise<void> {
    const hook = form.settings.webhook;
    if (!hook?.enabled || !hook.url) return;

    const payload = {
      formId: form._id,
      formName: form.name,
      formSlug: form.slug,
      submissionId: submission._id,
      submittedAt: submission.createdAt,
      data: submission.submissionData,
    };

    const maxAttempts = Math.max(1, (hook.retryCount ?? 0) + 1);
    let lastResult: { ok: boolean; statusCode?: number; response?: string } = { ok: false };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      lastResult = await postOnce(hook.url, hook.method, hook.headers ?? {}, payload);
      if (lastResult.ok) break;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, RETRY_BASE_DELAY_MS * 2 ** attempt));
      }
    }

    if (submission._id) {
      await WebhookService.logAttempt(submission._id, lastResult.ok ? 'sent' : 'failed', lastResult);
    }
  },

  /** Re-attempt a previously failed webhook for an existing submission. */
  async retryWebhook(submissionId: string): Promise<void> {
    const pageDb = await getPageDbConnection();
    const Submission = getFormSubmissionModel(pageDb);
    const Form = getFormModel(pageDb);
    const tenantId = resolveTenantId();

    const subDoc = await Submission.findOne({ _id: submissionId, tenantId }).lean().exec();
    if (!subDoc) return;
    const submission = subDoc as unknown as ISubmission;

    const formDoc = await Form.findOne({ _id: submission.formId, tenantId }).lean().exec();
    if (!formDoc) return;

    await WebhookService.triggerWebhook(formDoc as unknown as IForm, {
      ...submission,
      submissionData:
        submission.submissionData instanceof Map
          ? Object.fromEntries(submission.submissionData as Map<string, unknown>)
          : submission.submissionData,
    });
  },
};

export type WebhookServiceType = typeof WebhookService;
