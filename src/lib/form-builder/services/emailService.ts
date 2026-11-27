import type { IForm, ISubmission } from '@/types/form-builder';
import { getPluginModel, getUserDbConnection } from '@/utils/db';
import { getDynamicEnv } from '@/utils/dynamicEnv';
import mongoose, { Schema } from 'mongoose';
import nodemailer from 'nodemailer';

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
  useConfiguredRecipient?: boolean;
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

interface EmailPluginConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  recipientEmail?: string;
  replyTo?: string;
}

interface EmailPluginLog {
  to: string;
  subject: string;
  status: 'sent' | 'failed';
  error?: string;
  bodyPreview?: string;
  sentBy?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

function buildFromAddress(config: EmailPluginConfig): string {
  const email = String(config.fromEmail || '').trim();
  const name = String(config.fromName || '').trim();
  if (!name) return email;
  return `"${name.replace(/"/g, '\\"')}" <${email}>`;
}

function getEmailConfigModel(
  userDb: Awaited<ReturnType<typeof getUserDbConnection>>
): mongoose.Model<EmailPluginConfig> {
  const modelName = 'email-plugin_EmailConfig';
  if (userDb.models[modelName]) {
    return userDb.models[modelName] as mongoose.Model<EmailPluginConfig>;
  }

  const schema = new Schema<EmailPluginConfig>(
    {
      host: { type: String, default: '', trim: true },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '', trim: true },
      password: { type: String, default: '', trim: true },
      fromName: { type: String, default: '', trim: true },
      fromEmail: { type: String, default: '', trim: true },
      recipientEmail: { type: String, default: '', trim: true },
      replyTo: { type: String, default: '', trim: true },
    },
    { timestamps: true }
  );

  return userDb.model<EmailPluginConfig>(modelName, schema);
}

function getEmailLogModel(
  userDb: Awaited<ReturnType<typeof getUserDbConnection>>
): mongoose.Model<EmailPluginLog> {
  const modelName = 'email-plugin_EmailLog';
  if (userDb.models[modelName]) {
    return userDb.models[modelName] as mongoose.Model<EmailPluginLog>;
  }

  const schema = new Schema<EmailPluginLog>(
    {
      to: { type: String, required: true, trim: true },
      subject: { type: String, required: true, trim: true },
      status: { type: String, enum: ['sent', 'failed'], required: true },
      error: { type: String, default: '' },
      bodyPreview: { type: String, default: '' },
      sentBy: { type: String, default: '' },
    },
    { timestamps: true }
  );
  schema.index({ createdAt: -1 });

  return userDb.model<EmailPluginLog>(modelName, schema);
}

function previewBody(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

async function dispatchViaEmailPlugin(message: MailMessage): Promise<boolean> {
  const userDb = await getUserDbConnection();
  const PluginModel = getPluginModel();
  const plugin = await PluginModel.findOne({ pluginId: 'email-plugin', isActive: true }).lean();
  if (!plugin) return false;

  const EmailConfig = getEmailConfigModel(userDb);
  const config = (await EmailConfig.findOne({}).lean()) as EmailPluginConfig | null;
  if (!config) return false;

  const to = String(
    message.useConfiguredRecipient ? config.recipientEmail || message.to : message.to
  ).trim();
  const host = String(config.host || '').trim();
  const user = String(config.user || '').trim();
  const password = String(config.password || '').trim();
  const fromEmail = String(config.fromEmail || '').trim();

  if (!host || !user || !password || !fromEmail || !isEmail(to)) return false;

  const transport = nodemailer.createTransport({
    host,
    port: typeof config.port === 'number' ? config.port : 587,
    secure: Boolean(config.secure),
    auth: { user, pass: password },
  });

  try {
    await transport.sendMail({
      from: buildFromAddress(config),
      to,
      subject: message.subject,
      html: message.html,
      replyTo: config.replyTo || undefined,
    });

    await getEmailLogModel(userDb).create({
      to,
      subject: message.subject,
      status: 'sent',
      bodyPreview: previewBody(message.html),
      sentBy: 'website',
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
    await getEmailLogModel(userDb).create({
      to,
      subject: message.subject,
      status: 'failed',
      error: errorMessage,
      bodyPreview: previewBody(message.html),
      sentBy: 'website',
    });
    throw error;
  } finally {
    transport.close();
  }
}

/** Single dispatch point. Replace with a real provider; never throws upward. */
async function dispatch(message: MailMessage): Promise<void> {
  const env = getDynamicEnv() as Record<string, string | undefined>;
  const endpoint = env.MAIL_WEBHOOK_URL;
  try {
    if (await dispatchViaEmailPlugin(message)) {
      return;
    }

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
    if (!notif?.enabled) return;
    const vars = templateVars(form, submission);
    const html =
      renderTemplate(notif.adminTemplate || '', vars) ||
      `<p>New submission for <strong>${form.name}</strong>.</p><pre>${escapeHtml(
        JSON.stringify(submission.submissionData, null, 2)
      )}</pre>`;
    await dispatch({
      to: notif.adminEmail || '',
      subject: `New submission: ${form.name}`,
      html,
      useConfiguredRecipient: true,
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
