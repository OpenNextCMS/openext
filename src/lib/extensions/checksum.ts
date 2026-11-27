import { createHash } from 'node:crypto';

export function sha256(bytes: Buffer | Uint8Array | ArrayBuffer): string {
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
  return createHash('sha256').update(buffer).digest('hex');
}
