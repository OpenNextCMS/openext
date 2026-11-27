import crypto from 'crypto';
import { Schema } from 'mongoose';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { RAZORPAY_GATEWAY_PLUGIN_ID } from '@/lib/payments/constants';
import {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
  maskCredential,
} from '@/lib/security/credentialEncryption';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export type RazorpayGatewayPublicConfig = {
  configured: boolean;
  keyId: string;
  businessName: string;
  currency: string;
  mode: 'test' | 'live' | string;
};

export type RazorpayOrderResult = {
  order: Record<string, unknown>;
  keyId: string;
  currency: string;
  businessName: string;
};

export type RazorpayVerifyResult = {
  valid: boolean;
  orderId: string;
  paymentId: string;
  message: string;
};

type RazorpayConfigDoc = {
  keyId?: string;
  keySecret?: string;
  secretStored?: boolean;
  secretEncrypted?: boolean;
  businessName?: string;
  defaultCurrency?: string;
  mode?: string;
};

const RazorpayConfigSchema = new Schema(
  {
    keyId: { type: String, default: '', trim: true },
    keySecret: { type: String, default: '', select: false },
    secretStored: { type: Boolean, default: false },
    secretEncrypted: { type: Boolean, default: false },
    businessName: { type: String, default: '', trim: true },
    defaultCurrency: { type: String, default: 'INR', trim: true },
    mode: { type: String, default: 'test', trim: true },
    credentialsUpdatedAt: { type: Date },
    credentialsUpdatedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

function inferMode(keyId: string): 'test' | 'live' {
  const id = String(keyId || '').trim();
  if (id.startsWith('rzp_live_')) return 'live';
  return 'test';
}

function isConfigured(doc: RazorpayConfigDoc): boolean {
  const keyId = String(doc.keyId || '').trim();
  if (!keyId) return false;
  if (doc.secretStored) return true;
  return Boolean(String(doc.keySecret || '').trim());
}

function readSecret(doc: RazorpayConfigDoc): string {
  const stored = String(doc.keySecret || '').trim();
  if (!stored) return '';
  return decryptCredential(stored);
}

async function migratePlaintextSecret(doc: RazorpayConfigDoc & { save?: () => Promise<unknown> }) {
  const stored = String(doc.keySecret || '').trim();
  if (!stored || isEncryptedCredential(stored)) return;

  doc.keySecret = encryptCredential(stored);
  doc.secretStored = true;
  doc.secretEncrypted = true;
  if (typeof doc.save === 'function') {
    await doc.save();
  }
}

function buildAuthHeader(keyId: string, keySecret: string): string {
  const token = Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString('base64');
  return `Basic ${token}`;
}

async function razorpayRequest(
  keyId: string,
  keySecret: string,
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<Record<string, unknown>> {
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: buildAuthHeader(keyId, keySecret),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const errObj = data?.error as { description?: string; reason?: string } | undefined;
    const message =
      errObj?.description ||
      errObj?.reason ||
      (data?.message as string | undefined) ||
      `Razorpay API error (${response.status})`;
    throw new Error(message);
  }

  return data || {};
}

async function getRazorpayConfigModel() {
  const conn = await getUserDbConnection();
  const modelName = `${RAZORPAY_GATEWAY_PLUGIN_ID}_RazorpayConfig`;
  return conn.models[modelName] || conn.model(modelName, RazorpayConfigSchema);
}

async function getConfigDoc(withSecret = false): Promise<RazorpayConfigDoc | null> {
  const RazorpayConfig = await getRazorpayConfigModel();
  const query = RazorpayConfig.findOne({});
  if (withSecret) {
    return (await query.select('+keySecret').lean().exec()) as RazorpayConfigDoc | null;
  }
  return (await query.lean().exec()) as RazorpayConfigDoc | null;
}

async function getCredentialsFromDoc(): Promise<{
  keyId: string;
  keySecret: string;
  currency: string;
  businessName: string;
}> {
  const RazorpayConfig = await getRazorpayConfigModel();
  const doc = (await RazorpayConfig.findOne({}).select('+keySecret').exec()) as
    | (RazorpayConfigDoc & { save: () => Promise<unknown> })
    | null;

  if (!doc || !isConfigured(doc)) {
    throw new Error('Razorpay is not configured. Install and connect the Payment Gateway plugin.');
  }

  await migratePlaintextSecret(doc);

  const keySecret = readSecret(doc);
  if (!keySecret) {
    throw new Error(
      'Razorpay Key Secret could not be decrypted. Verify CREDENTIAL_ENCRYPTION_KEY matches the key used when credentials were saved.'
    );
  }

  return {
    keyId: String(doc.keyId).trim(),
    keySecret,
    currency: String(doc.defaultCurrency || 'INR').trim().toUpperCase(),
    businessName: String(doc.businessName || '').trim(),
  };
}

/**
 * True when the Razorpay gateway plugin is installed/active and credentials are saved.
 */
export async function isRazorpayGatewayConfigured(): Promise<boolean> {
  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugin = await PluginModel.findOne({
      pluginId: RAZORPAY_GATEWAY_PLUGIN_ID,
      isActive: true,
    })
      .select('pluginId isActive hasBackend')
      .lean()
      .exec();

    if (!plugin) return false;

    const doc = await getConfigDoc();
    if (!doc) return false;
    return isConfigured(doc);
  } catch (error) {
    console.warn('[payments] Failed to resolve Razorpay gateway status:', error);
    return false;
  }
}

/** Public checkout config (Key ID only — never returns secret). */
export async function getRazorpayPublicConfig(): Promise<RazorpayGatewayPublicConfig> {
  const doc = await getConfigDoc();
  if (!doc || !isConfigured(doc)) {
    return {
      configured: false,
      keyId: '',
      businessName: '',
      currency: 'INR',
      mode: 'test',
    };
  }

  return {
    configured: true,
    keyId: String(doc.keyId).trim(),
    businessName: String(doc.businessName || '').trim(),
    currency: String(doc.defaultCurrency || 'INR').trim().toUpperCase(),
    mode: String(doc.mode || inferMode(String(doc.keyId))),
  };
}

/**
 * Create a Razorpay order using the connected account.
 * Amount is in smallest currency unit (paise for INR).
 */
export async function createRazorpayOrder(options: {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  partialPayment?: boolean;
}): Promise<RazorpayOrderResult> {
  const creds = await getCredentialsFromDoc();
  const parsedAmount = Number(options.amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error('amount must be a positive number (in paise for INR)');
  }

  const currency = String(options.currency || creds.currency || 'INR')
    .trim()
    .toUpperCase();

  const order = await razorpayRequest(creds.keyId, creds.keySecret, '/orders', {
    method: 'POST',
    body: {
      amount: Math.round(parsedAmount),
      currency,
      receipt: options.receipt ? String(options.receipt).slice(0, 40) : `rcpt_${Date.now()}`,
      notes: options.notes || {},
      partial_payment: Boolean(options.partialPayment),
    },
  });

  return {
    order,
    keyId: creds.keyId,
    currency,
    businessName: creds.businessName,
  };
}

/** Verify Razorpay payment signature after checkout. */
export async function verifyRazorpayPayment(options: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<RazorpayVerifyResult> {
  const creds = await getCredentialsFromDoc();
  const orderId = String(options.razorpay_order_id || '').trim();
  const paymentId = String(options.razorpay_payment_id || '').trim();
  const signature = String(options.razorpay_signature || '').trim();

  if (!orderId || !paymentId || !signature) {
    throw new Error(
      'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
    );
  }

  const payload = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', creds.keySecret).update(payload).digest('hex');
  const valid = expected === signature;

  return {
    valid,
    orderId,
    paymentId,
    message: valid ? 'Payment verified successfully.' : 'Invalid payment signature.',
  };
}

/** Mask Key ID for safe admin display. */
export function maskRazorpayKeyId(keyId: string): string {
  return maskCredential(keyId);
}
