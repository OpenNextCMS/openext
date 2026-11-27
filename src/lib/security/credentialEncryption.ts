import crypto from 'crypto';
import { getDynamicEnv } from '@/utils/dynamicEnv';

/** Stored credential prefix — versioned for future algorithm upgrades. */
export const CREDENTIAL_ENCRYPTION_PREFIX = 'enc:v1:';

const SCRYPT_SALT = 'nextcms-credential-v1';
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function readMasterSecret(): string {
  const dynamic = getDynamicEnv();
  const fromDedicated = String(
    process.env.CREDENTIAL_ENCRYPTION_KEY || dynamic.CREDENTIAL_ENCRYPTION_KEY || ''
  ).trim();
  if (fromDedicated) return fromDedicated;

  const jwt = String(process.env.JWT_SECRET || dynamic.JWT_SECRET || '').trim();
  if (jwt && jwt !== 'change-me' && jwt !== 'your_jwt_secret') return jwt;

  throw new Error(
    'Set CREDENTIAL_ENCRYPTION_KEY (recommended) or a strong JWT_SECRET before storing payment credentials.'
  );
}

function deriveKey(master: string): Buffer {
  return crypto.scryptSync(master, SCRYPT_SALT, 32, SCRYPT_OPTIONS);
}

export function isEncryptedCredential(value: string): boolean {
  return String(value || '').startsWith(CREDENTIAL_ENCRYPTION_PREFIX);
}

/**
 * Encrypt a sensitive credential for database storage (AES-256-GCM).
 */
export function encryptCredential(plaintext: string): string {
  const text = String(plaintext || '').trim();
  if (!text) return '';

  const key = deriveKey(readMasterSecret());
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${CREDENTIAL_ENCRYPTION_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/**
 * Decrypt a stored credential. Plaintext legacy values are returned as-is (migrate on next save).
 */
export function decryptCredential(stored: string): string {
  const value = String(stored || '').trim();
  if (!value) return '';

  if (!isEncryptedCredential(value)) {
    return value;
  }

  const payload = value.slice(CREDENTIAL_ENCRYPTION_PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split('.');
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted credential format');
  }

  const key = deriveKey(readMasterSecret());
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const data = Buffer.from(dataPart, 'base64url');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/** Mask a credential for admin UI (never show full secret). */
export function maskCredential(value: string, visible = 4): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= visible * 2) return '••••••••';
  return `${text.slice(0, visible)}…${text.slice(-visible)}`;
}
