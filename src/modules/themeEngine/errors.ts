import type { ManifestIssue, ThemeValidationIssue } from './types';

/**
 * Theme Engine — typed error hierarchy.
 *
 * Every module throws a typed error so callers (especially ThemeManager's
 * fallback policy, §4.13) can branch on the error KIND rather than parse
 * message strings.
 */

export type ThemeEngineErrorCode =
  | 'MANIFEST_VALIDATION_FAILED'
  | 'THEME_VALIDATION_FAILED'
  | 'THEME_INSTALL_FAILED'
  | 'THEME_NOT_FOUND'
  | 'THEME_ALREADY_EXISTS'
  | 'THEME_ACTIVE_LOCKED'
  | 'THEME_NOT_INSTALLED'
  | 'TEMPLATE_RESOLUTION_FAILED'
  | 'THEME_LOAD_FAILED'
  | 'THEME_RENDER_FAILED'
  | 'PREVIEW_SESSION_INVALID';

/** Base class for every Theme Engine failure. */
export class ThemeEngineError extends Error {
  readonly code: ThemeEngineErrorCode;

  constructor(code: ThemeEngineErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) Error.captureStackTrace(this, new.target);
  }
}

/**
 * §4.1 — thrown by ManifestParser. Carries EVERY failing field from a single
 * validation pass (never just the first), so the UI can list all problems at once.
 */
export class ManifestValidationError extends ThemeEngineError {
  readonly issues: ManifestIssue[];

  constructor(issues: ManifestIssue[]) {
    super(
      'MANIFEST_VALIDATION_FAILED',
      `theme.json is invalid (${issues.length} ${issues.length === 1 ? 'issue' : 'issues'}): ` +
        issues.map((i) => `${i.path || '(root)'}: ${i.message}`).join('; ')
    );
    this.issues = issues;
  }
}

/** §4.2 — thrown when an extracted theme directory fails whole-package validation. */
export class ThemeValidationError extends ThemeEngineError {
  readonly errors: ThemeValidationIssue[];
  readonly warnings: ThemeValidationIssue[];

  constructor(errors: ThemeValidationIssue[], warnings: ThemeValidationIssue[] = []) {
    super('THEME_VALIDATION_FAILED', `Theme package failed validation (${errors.length} error(s)).`);
    this.errors = errors;
    this.warnings = warnings;
  }
}

/** §4.3 — thrown by ThemeInstaller; carries the validator's error list. */
export class ThemeInstallError extends ThemeEngineError {
  readonly errors: ThemeValidationIssue[];

  constructor(message: string, errors: ThemeValidationIssue[] = []) {
    super('THEME_INSTALL_FAILED', message);
    this.errors = errors;
  }
}

/** §4.4 */
export class ThemeNotFoundError extends ThemeEngineError {
  constructor(slug: string) {
    super('THEME_NOT_FOUND', `Theme "${slug}" was not found.`);
  }
}

export class ThemeAlreadyExistsError extends ThemeEngineError {
  constructor(slug: string) {
    super('THEME_ALREADY_EXISTS', `Theme "${slug}" is already installed. Pass the replace flag to upgrade it.`);
  }
}

/** §4.4 — `remove()` must refuse to delete the active theme. */
export class ThemeActiveLockedError extends ThemeEngineError {
  constructor(slug: string) {
    super('THEME_ACTIVE_LOCKED', `Theme "${slug}" is active and cannot be removed. Activate another theme first.`);
  }
}

export class ThemeNotInstalledError extends ThemeEngineError {
  constructor(slug: string, status: string) {
    super('THEME_NOT_INSTALLED', `Theme "${slug}" cannot be activated (status: ${status}).`);
  }
}

/** §4.8 — triggers ThemeManager's default-theme fallback. */
export class TemplateResolutionError extends ThemeEngineError {
  constructor(slug: string, tried: string[]) {
    super(
      'TEMPLATE_RESOLUTION_FAILED',
      `No template resolved for theme "${slug}". Tried: ${tried.join(' → ') || '(none)'}.`
    );
  }
}

/** §4.6 */
export class ThemeLoadError extends ThemeEngineError {
  readonly slug: string;
  constructor(slug: string, message: string) {
    super('THEME_LOAD_FAILED', `Failed to load theme "${slug}": ${message}`);
    this.slug = slug;
  }
}

/** §4.10 — propagated so ThemeManager knows to retry with the default theme. */
export class ThemeRenderError extends ThemeEngineError {
  readonly slug: string;
  readonly cause?: unknown;
  constructor(slug: string, message: string, cause?: unknown) {
    super('THEME_RENDER_FAILED', `Theme "${slug}" failed to render: ${message}`);
    this.slug = slug;
    this.cause = cause;
  }
}

/** §4.12 */
export class PreviewSessionInvalidError extends ThemeEngineError {
  constructor() {
    super('PREVIEW_SESSION_INVALID', 'Preview session is invalid or has expired.');
  }
}
