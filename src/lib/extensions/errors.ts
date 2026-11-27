export interface ExtensionDiagnostic {
  code: string;
  message: string;
  path?: string;
}

export type ExtensionValidationStatus =
  | 'valid'
  | 'invalid_package'
  | 'missing_target_plugin'
  | 'incompatible_target_version'
  | 'unsupported_sdk'
  | 'missing_dependency'
  | 'permission_approval_required'
  | 'duplicate_installation';

const STATUS_PRIORITY: ExtensionValidationStatus[] = [
  'invalid_package',
  'missing_target_plugin',
  'incompatible_target_version',
  'unsupported_sdk',
  'missing_dependency',
  'duplicate_installation',
  'permission_approval_required',
  'valid',
];

export function primaryValidationStatus(
  statuses: ExtensionValidationStatus[]
): ExtensionValidationStatus {
  if (statuses.length === 0) return 'valid';
  return [...statuses].sort(
    (a, b) => STATUS_PRIORITY.indexOf(a) - STATUS_PRIORITY.indexOf(b)
  )[0];
}

export class ExtensionError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly errors: ExtensionDiagnostic[];

  constructor(
    code: string,
    message: string,
    httpStatus = 400,
    errors: ExtensionDiagnostic[] = []
  ) {
    super(message);
    this.name = 'ExtensionError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.errors = errors.length > 0 ? errors : [{ code, message }];
  }
}

export function httpStatusForValidation(status: ExtensionValidationStatus): number {
  if (status === 'duplicate_installation') return 409;
  if (
    status === 'missing_target_plugin' ||
    status === 'incompatible_target_version' ||
    status === 'unsupported_sdk' ||
    status === 'missing_dependency'
  ) {
    return 422;
  }
  if (status === 'permission_approval_required') return 422;
  return 400;
}

export function validationToError(
  status: ExtensionValidationStatus,
  errors: ExtensionDiagnostic[],
  fallback: string
): ExtensionError {
  const message = errors[0]?.message || fallback;
  return new ExtensionError(status, message, httpStatusForValidation(status), errors);
}

/** User-facing message. One line, no stack, bounded length. */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof ExtensionError) return error.message.slice(0, 500);
  if (error instanceof Error) {
    const line = error.message.split('\n')[0] || 'Unexpected error';
    return line.slice(0, 500);
  }
  return 'Unexpected error';
}
