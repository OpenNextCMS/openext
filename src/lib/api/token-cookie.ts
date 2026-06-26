import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === 'https:';
}

/** Cookie options for the auth `token` — always scoped to `/` so dashboard routes receive it. */
export function tokenCookieOptions(request: Request, maxAge = 86_400): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function clearTokenCookieOptions(request: Request): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  };
}
