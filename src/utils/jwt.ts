import { createHmac } from 'node:crypto';

type JwtPayload = Record<string, unknown>;

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString('base64url');
}

export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');

  return `${data}.${signature}`;
}
