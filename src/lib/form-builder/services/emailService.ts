import type { IForm, ISubmission } from '@/types/form-builder';
import { getDynamicEnv } from '@/utils/dynamicEnv';

/**
 * EmailService — admin notifications and user autoresponders.
 *
 * The repo has no mail transport wired up. This service provides a clean
 * integration seam: it renders templates and hands a fully-formed message to a
 * pluggable `sendMail` transport. By default it logs (dev) and, when SMTP/HTTP
 * mail env vars are present, posts to a configured mail webhook. Swap in a real
 * provider (Resend/SES/SMTP) at the single `dispatch` point below.
 */

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}

/** Replace {{variables}} in a template with submission values. */
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    if (value == null) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/** Build the flat variable bag exposed to templates from a submission. */
function templateVars(form: IForm, submission: ISubmission): Record<string, unknown> {
  return {
    formName: form.name,
    formSlug: form.slug,
    submittedAt: submission.createdAt ?? new Date().toISOString(),
    ...submission.submissionData,
  };
}

/** Single dispatch point. Replace with a real provider; never throws upward. */
async function dispatch(message: MailMessage): Promise<void> {
  const env = getDynamicEnv() as Record<string, string | undefined>;
  const endpoint = env.MAIL_WEBHOOK_URL;
  try {
    if (endpoint) {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.MAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.MAIL_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify(message),
      });
      return;
    }
    // No transport configured — log so dev still sees the intent.
    console.info('[form-builder] (no mail transport) would send email:', {
      to: message.to,
      subject: message.subject,
    });
  } catch (err) {
    console.error('[form-builder] email dispatch failed:', err);
  }
}

export const EmailService = {
  renderTemplate,

  async sendAdminNotification(form: IForm, submission: ISubmission): Promise<void> {
    const notif = form.settings.notifications;
    if (!notif?.enabled || !notif.adminEmail) return;
    const vars = templateVars(form, submission);
    const html =
      renderTemplate(notif.adminTemplate || '', vars) ||
      `<p>New submission for <strong>${form.name}</strong>.</p><pre>${escapeHtml(
        JSON.stringify(submission.submissionData, null, 2)
      )}</pre>`;
    await dispatch({
      to: notif.adminEmail,
      subject: `New submission: ${form.name}`,
      html,
    });
  },

  async sendUserAutoresponder(form: IForm, submission: ISubmission): Promise<void> {
    const notif = form.settings.notifications;
    if (!notif?.enabled || !notif.userEmailField) return;
    const to = submission.submissionData[notif.userEmailField];
    if (typeof to !== 'string' || !to.includes('@')) return;
    const vars = templateVars(form, submission);
    const html =
      renderTemplate(notif.userTemplate || '', vars) ||
      `<p>Thanks for your submission to <strong>${form.name}</strong>.</p>`;
    await dispatch({ to, subject: `Thanks for contacting us`, html });
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export type EmailServiceType = typeof EmailService;
