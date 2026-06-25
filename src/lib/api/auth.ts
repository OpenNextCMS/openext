import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { ApiError } from './errors';

export interface AuthUser {
  userId: string;
  email?: string;
  role?: number | string;
}

/**
 * Read the current user from the `token` cookie. Returns null when absent.
 *
 * NOTE: this is a thin placeholder that decodes (does not cryptographically
 * verify) the JWT, matching the rest of the codebase. Swap in real
 * verification here when auth is hardened — every admin route goes through it.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwtDecode<AuthUser>(token);
    if (!decoded?.userId) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Require an authenticated user or throw a 401 ApiError. */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new ApiError('Unauthorized', 401);
  }
  return user;
}
