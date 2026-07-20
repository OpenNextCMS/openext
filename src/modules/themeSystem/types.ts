/**
 * Shared types for the Theme Upload System.
 * Kept separate so services depend on data contracts, not on each other's files.
 */

/** Parsed & validated theme.json manifest (spec §1). */
export interface ThemeManifest {
  name: string;
  slug: string;
  version: string;
  author: string;
  description: string;
  homepage?: string;
  license?: string;
  minimumCMSVersion?: string;
  thumbnail: string;
  /** Drives the auto-generated Theme Options page (§1). */
  settings: Record<string, unknown>;
  /** Optional declared dependencies (name → semver range), checked pre-install (§15). */
  dependencies?: Record<string, string>;
  /** Optional runtime requirements (§15). */
  requires?: { node?: string; dbSchema?: string };
}

/** A safe, root-relative file entry produced by extraction. */
export interface SafeZipEntry {
  /** Path relative to the package root (posix), e.g. `layouts/default.tsx`. */
  relativePath: string;
  /** Decompressed size in bytes. */
  size: number;
  getBuffer: () => Promise<Buffer>;
}

/** Result of extracting a validated package to a temp workspace. */
export interface ExtractedTheme {
  /** Absolute temp directory the package was written to. */
  tmpDir: string;
  /** Root-relative file paths that were written. */
  files: string[];
  /** Raw contents of theme.json (or null if absent — caller decides). */
  manifestRaw: string | null;
  /** Total decompressed bytes. */
  totalBytes: number;
}

/** Staged install/update progress (spec §2 log messages). */
export type InstallStage =
  | 'uploading'
  | 'validating'
  | 'extracting'
  | 'checking-manifest'
  | 'installing'
  | 'generating-cache'
  | 'success'
  | 'error';

export interface InstallLogEntry {
  stage: InstallStage;
  message: string;
  at: string; // ISO timestamp
}

/** Sink for pipeline logs (defaults to console; UI can stream these). */
export type InstallLogger = (entry: InstallLogEntry) => void;

/** Context passed into service operations (auth/tenant identity). */
export interface ThemeOperationContext {
  userId?: string;
  /** ISO timestamp provided by the caller (services never call Date.now directly in loops). */
  now?: string;
}
