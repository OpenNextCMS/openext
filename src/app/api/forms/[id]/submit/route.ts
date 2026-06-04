import { NextRequest } from 'next/server';
import { apiOk, apiError, handleApiError } from '@/lib/api/response';
import { getPageDbConnection, getFormModel } from '@/utils/db';
import { requireFormBuilderActive } from '@/lib/form-builder/lifecycle';
import { SubmissionService } from '@/lib/form-builder/services/submissionService';
import { WebhookService } from '@/lib/form-builder/services/webhookService';
import { EmailService } from '@/lib/form-builder/services/emailService';
import { AnalyticsService } from '@/lib/form-builder/services/analyticsService';
import { verifyTurnstile } from '@/lib/form-builder/spam';
import type { IForm } from '@/types/form-builder';
import { FormStatus } from '@/types/form-builder';

/**
 * POST /api/forms/[id]/submit — PUBLIC submission endpoint (no auth).
 *
 * Tenancy is resolved from the form's own `tenantId` field, not a JWT. The
 * form must exist, the plugin must be active and the form must be published.
 * Webhooks and emails are dispatched without blocking the response.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Plugin must be active for public submissions to be accepted.
    await requireFormBuilderActive();
    const { id } = await params;

    const pageDb = await getPageDbConnection();
    const Form = getFormModel(pageDb);
    const formDoc = await Form.findOne({ _id: id }).lean().exec();
    if (!formDoc) return apiError('Form not found', 404);
    const form = formDoc as unknown as IForm;

    // The form's stored tenantId is the isolation key for everything below.
    const tenantId = form.tenantId || '';
    if (!tenantId) return apiError('Form is not associated with a tenant', 409);

    if (form.status !== FormStatus.Published) {
      return apiError('This form is not accepting submissions', 409);
    }

    const body = (await req.json().catch(() => ({}))) as { data?: Record<string, unknown>; turnstileToken?: string };
    const data = (body.data ?? {}) as Record<string, unknown>;

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;
    const userAgent = req.headers.get('user-agent') || undefined;
    const sourcePage = req.headers.get('referer') || undefined;

    // 1) Spam: honeypot.
    if (SubmissionService.detectSpam(data, form.settings)) {
      // Silently accept to avoid signaling the honeypot to bots.
      return apiOk({ success: true, message: form.settings.successMessage });
    }

    // 2) Spam: Cloudflare Turnstile (if enabled).
    if (form.settings.spam?.turnstileEnabled) {
      const ok = await verifyTurnstile(body.turnstileToken, ipAddress);
      if (!ok) return apiError('Captcha verification failed', 400);
    }

    // 3) Spam: per-IP throttle.
    const throttled = await SubmissionService.isThrottled(
      tenantId,
      id,
      ipAddress,
      form.settings.spam?.throttleLimit ?? 0
    );
    if (throttled) {
      return apiError('Too many submissions. Please try again later.', 429);
    }

    // 4) Validation (Zod schema built from the form's fields + conditional logic).
    const { valid, errors } = SubmissionService.validateSubmission(form, data);
    if (!valid) {
      return apiError({ message: 'Validation failed', fields: errors }, 400);
    }

    // 5) Persist.
    const submission = await SubmissionService.createSubmission(tenantId, id, data, {
      ipAddress,
      userAgent,
      sourcePage,
    });

    // 6) Side-effects — do not block the response.
    void Promise.allSettled([
      WebhookService.triggerWebhook(form, submission),
      EmailService.sendAdminNotification(form, submission),
      EmailService.sendUserAutoresponder(form, submission),
      AnalyticsService.trackCompletion(tenantId, id),
    ]);

    return apiOk({
      success: true,
      message: form.settings.successMessage,
      redirectUrl: form.settings.redirectUrl || undefined,
      errors: {},
    });
  } catch (err) {
    return handleApiError(err);
  }
}
