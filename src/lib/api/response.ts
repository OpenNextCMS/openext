import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, zodErrorToFields } from './errors';

// Consistent response envelope used by every blog-system route handler:
//   success -> { data, error: null, meta? }
//   failure -> { data: null, error: { message, fields? } }

export interface ApiMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface ApiErrorBody {
  message: string;
  fields?: Record<string, string>;
}

export function apiOk<T>(
  data: T,
  init: { status?: number; meta?: ApiMeta } = {}
): NextResponse {
  const body: { data: T; error: null; meta?: ApiMeta } = { data, error: null };
  if (init.meta) body.meta = init.meta;
  return NextResponse.json(body, { status: init.status ?? 200 });
}

export function apiError(
  error: string | ApiErrorBody,
  status = 400
): NextResponse {
  const payload: ApiErrorBody = typeof error === 'string' ? { message: error } : error;
  return NextResponse.json({ data: null, error: payload }, { status });
}

/** Map any thrown error to a consistent JSON response. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return apiError({ message: 'Validation failed', fields: zodErrorToFields(err) }, 400);
  }
  if (err instanceof ApiError) {
    return apiError(
      { message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
      err.status
    );
  }
  // Surface Mongo duplicate-key errors as a clean 409.
  if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
    const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern || {};
    const field = Object.keys(keyPattern)[0] || 'value';
    return apiError(
      { message: `Duplicate ${field}`, fields: { [field]: `This ${field} already exists` } },
      409
    );
  }
  console.error('Unhandled API error:', err);
  return apiError({ message: 'Internal Server Error' }, 500);
}
