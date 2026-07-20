/**
 * Typed error hierarchy for the Theme Upload System (spec §16).
 *
 * Every failure path in the install/update/activate/delete pipelines throws one
 * of these. Each carries a stable machine `code`, an HTTP `statusCode`, and an
 * optional `details` bag — so controllers can map errors to responses uniformly
 * and the admin UI can show specific, actionable messages.
 *
 * SOLID: a single base type (LSP-safe) with narrow subclasses; consumers depend
 * on the `ThemeSystemError` abstraction, never on inline string matching.
 */

export type ThemeErrorCode =
  | 'THEME_MANIFEST_MISSING'
  | 'INVALID_MANIFEST'
  | 'INVALID_VERSION'
  | 'THEME_ALREADY_INSTALLED'
  | 'DUPLICATE_SLUG'
  | 'EXTRACTION_FAILED'
  | 'CORRUPTED_ZIP'
  | 'UNSUPPORTED_CMS_VERSION'
  | 'UNSUPPORTED_DEPENDENCY'
  | 'PERMISSION_DENIED'
  | 'THEME_NOT_FOUND'
  | 'ACTIVE_THEME_LOCKED'
  | 'INVALID_STRUCTURE'
  | 'SECURITY_VIOLATION'
  | 'UPLOAD_TOO_LARGE'
  | 'BACKUP_FAILED'
  | 'ROLLBACK_FAILED'
  | 'THEME_ENGINE_ERROR';

/** Base class for every recoverable Theme System failure. */
export class ThemeSystemError extends Error {
  readonly code: ThemeErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ThemeErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    // Restore prototype chain when compiled to ES5/CJS.
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, new.target);
  }

  /** Serializable shape returned to the client / logged. */
  toJSON(): { code: ThemeErrorCode; message: string; details?: Record<string, unknown> } {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

/* ------------------------------------------------------------------ *
 * Concrete errors — one per documented failure (spec §4, §5, §11, §16)
 * ------------------------------------------------------------------ */

export class ManifestMissingError extends ThemeSystemError {
  constructor(details?: Record<string, unknown>) {
    super('THEME_MANIFEST_MISSING', 'Theme manifest (theme.json) is missing from the package.', 422, details);
  }
}

export class InvalidManifestError extends ThemeSystemError {
  constructor(message = 'theme.json is invalid or malformed.', details?: Record<string, unknown>) {
    super('INVALID_MANIFEST', message, 422, details);
  }
}

export class InvalidVersionError extends ThemeSystemError {
  constructor(message = 'Theme version is invalid.', details?: Record<string, unknown>) {
    super('INVALID_VERSION', message, 422, details);
  }
}

export class ThemeAlreadyInstalledError extends ThemeSystemError {
  constructor(slug: string, version: string) {
    super('THEME_ALREADY_INSTALLED', `Theme "${slug}" version ${version} is already installed.`, 409, { slug, version });
  }
}

export class DuplicateSlugError extends ThemeSystemError {
  constructor(slug: string) {
    super('DUPLICATE_SLUG', `A theme with slug "${slug}" is already installed.`, 409, { slug });
  }
}

export class ExtractionFailedError extends ThemeSystemError {
  constructor(message = 'Failed to extract the theme archive.', details?: Record<string, unknown>) {
    super('EXTRACTION_FAILED', message, 500, details);
  }
}

export class CorruptedZipError extends ThemeSystemError {
  constructor(message = 'The uploaded file is not a valid or is a corrupted ZIP archive.', details?: Record<string, unknown>) {
    super('CORRUPTED_ZIP', message, 400, details);
  }
}

export class UnsupportedCmsVersionError extends ThemeSystemError {
  constructor(required: string, current: string) {
    super(
      'UNSUPPORTED_CMS_VERSION',
      `Theme requires CMS ${required}, but this installation provides ${current}.`,
      422,
      { required, current }
    );
  }
}

export class UnsupportedDependencyError extends ThemeSystemError {
  constructor(dependency: string, required: string, current: string | null) {
    super(
      'UNSUPPORTED_DEPENDENCY',
      `Theme dependency "${dependency}@${required}" is not satisfied (found: ${current ?? 'none'}).`,
      422,
      { dependency, required, current }
    );
  }
}

export class PermissionDeniedError extends ThemeSystemError {
  constructor(message = 'You do not have permission to manage themes.') {
    super('PERMISSION_DENIED', message, 403);
  }
}

export class ThemeNotFoundError extends ThemeSystemError {
  constructor(slug: string) {
    super('THEME_NOT_FOUND', `Theme "${slug}" was not found.`, 404, { slug });
  }
}

export class ActiveThemeLockedError extends ThemeSystemError {
  constructor(slug: string) {
    super(
      'ACTIVE_THEME_LOCKED',
      `Theme "${slug}" is active and cannot be deleted. Activate another theme first.`,
      409,
      { slug }
    );
  }
}

export class InvalidStructureError extends ThemeSystemError {
  constructor(missing: string[]) {
    super('INVALID_STRUCTURE', `Invalid theme structure — missing required items: ${missing.join(', ')}.`, 422, { missing });
  }
}

export class SecurityViolationError extends ThemeSystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SECURITY_VIOLATION', `Security check failed: ${message}`, 400, details);
  }
}

export class UploadTooLargeError extends ThemeSystemError {
  constructor(maxBytes: number) {
    super('UPLOAD_TOO_LARGE', `Upload exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`, 413, { maxBytes });
  }
}

export class BackupFailedError extends ThemeSystemError {
  constructor(message = 'Failed to back up the existing theme before update.', details?: Record<string, unknown>) {
    super('BACKUP_FAILED', message, 500, details);
  }
}

export class RollbackFailedError extends ThemeSystemError {
  constructor(message = 'Update failed and the automatic rollback also failed.', details?: Record<string, unknown>) {
    super('ROLLBACK_FAILED', message, 500, details);
  }
}

export class ThemeEngineError extends ThemeSystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('THEME_ENGINE_ERROR', message, 500, details);
  }
}

/** Narrow an unknown thrown value to a ThemeSystemError (or wrap it). */
export function asThemeSystemError(err: unknown): ThemeSystemError {
  if (err instanceof ThemeSystemError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new ThemeSystemError('THEME_ENGINE_ERROR', message, 500);
}
