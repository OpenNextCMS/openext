import { randomBytes } from 'crypto';
import type { Types } from 'mongoose';
import { getPageDbConnection } from '@/utils/db';
import { getEngineThemePreviewSessionModel } from './models/ThemePreviewSession';
import { themeRegistry, type ThemeRegistry } from './ThemeRegistry';
import { ThemeNotFoundError } from './errors';
import { PREVIEW_SESSION_TTL_MS } from './config';
import type { ThemePreviewTicket } from './types';

/**
 * §4.12 ThemePreviewService — let an admin preview any installed (non-active)
 * theme without touching `theme_settings.activeThemeSlug`.
 *
 * Deliberately never imports `next/headers` or touches any HTTP cookie in
 * this file — the ROUTE HANDLER owns the httpOnly, `sameSite: strict` cookie
 * and passes the resolved slug into `RenderInput.previewThemeSlug` itself;
 * `ThemeRenderer` never reads a cookie either (spec §4.12).
 *
 * The token is an opaque, cryptographically random 256-bit value looked up
 * server-side on every read — a bearer token, not a signed JWT — which is
 * sufficient here since it is never decoded client-side and always validated
 * against the DB record (including its expiry) on use.
 */
export class ThemePreviewService {
  constructor(private readonly registry: ThemeRegistry = themeRegistry) {}

  async startPreview(slug: string, userId: Types.ObjectId | string): Promise<ThemePreviewTicket> {
    const theme = await this.registry.getBySlug(slug);
    if (!theme) throw new ThemeNotFoundError(slug);

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PREVIEW_SESSION_TTL_MS);

    const pageDb = await getPageDbConnection();
    const Model = getEngineThemePreviewSessionModel(pageDb);
    await Model.create({ token, themeSlug: slug, createdBy: userId, createdAt: new Date(), expiresAt });

    return { token, expiresAt };
  }

  /** Returns the previewed slug, or `null` if the token is unknown/invalid/expired. */
  async getPreviewTheme(token: string): Promise<string | null> {
    if (!token) return null;

    const pageDb = await getPageDbConnection();
    const Model = getEngineThemePreviewSessionModel(pageDb);
    // App-level expiry check IN ADDITION to the TTL index: Mongo's TTL monitor
    // sweeps periodically (default ~60s), so a just-expired document can still
    // physically exist for a short window — never trust "still in the
    // collection" as "still valid".
    const doc = await Model.findOne({ token, expiresAt: { $gt: new Date() } }).lean().exec();
    return doc?.themeSlug ?? null;
  }

  async endPreview(token: string): Promise<void> {
    if (!token) return;
    const pageDb = await getPageDbConnection();
    const Model = getEngineThemePreviewSessionModel(pageDb);
    await Model.deleteOne({ token }).exec();
  }
}

/** Convenience singleton. */
export const themePreviewService = new ThemePreviewService();
