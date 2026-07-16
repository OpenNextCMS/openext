import { NextResponse } from 'next/server';
import { asThemeSystemError } from '../errors';

/**
 * withThemeRoute — the single error-handling boundary for every Theme System
 * route handler (spec §16). Runs the handler and maps ANY thrown value to the
 * uniform `{ data:null, error }` envelope with the correct HTTP status, so no
 * route ever needs its own try/catch.
 */
export async function withThemeRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    const e = asThemeSystemError(err);
    if (e.statusCode >= 500) {
      console.error('[theme-system] unhandled error:', e.code, e.message, e.details ?? '');
    }
    return NextResponse.json({ data: null, error: e.toJSON() }, { status: e.statusCode });
  }
}
