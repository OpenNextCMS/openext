import { NextResponse } from 'next/server';
import type { ThemeErrorCode } from '../errors';

/**
 * Uniform API envelope for the Theme System: `{ data, error }`.
 * Success → `{ data, error: null }`; failure → `{ data: null, error: {...} }`.
 */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(
  code: ThemeErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    { data: null, error: { code, message, ...(details ? { details } : {}) } },
    { status }
  );
}
