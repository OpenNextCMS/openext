import { getDynamicEnv } from '@/utils/dynamicEnv';

/**
 * Cloudflare Turnstile server-side verification. The secret is read from env
 * (TURNSTILE_SECRET_KEY). When no secret is configured we fail-open (return
 * true) so a misconfigured deployment doesn't block every submission — the
 * honeypot + throttle still apply.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  token: string | undefined,
  ip?: string
): Promise<boolean> {
  const secret = (getDynamicEnv() as Record<string, string | undefined>).TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → don't hard-block
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);

    const res = await fetch(VERIFY_URL, { method: 'POST', body: form });
    const json = (await res.json()) as { success?: boolean };
    return !!json.success;
  } catch {
    return false;
  }
}
