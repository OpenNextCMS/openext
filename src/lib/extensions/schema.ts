import semver from 'semver';
import { z } from 'zod';
import { isSafeRelativePath } from '@/lib/plugins/manifest';
import {
  EXTENSION_CAPABILITIES,
  EXTENSION_ID_PATTERN,
  EXTENSION_MANIFEST_VERSION,
} from '@/lib/extensions/constants';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function hasDangerousKeys(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  for (const key of Object.keys(value as object)) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (hasDangerousKeys((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}

const extensionId = z
  .string()
  .trim()
  .regex(
    EXTENSION_ID_PATTERN,
    'must be 3-64 characters and use lowercase letters, numbers, hyphens, or underscores'
  );

const semverVersion = z
  .string()
  .trim()
  .refine((value) => semver.valid(value) !== null, 'must be a semantic version (for example 1.2.3)');

const semverRange = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => semver.validRange(value) !== null, 'must be a semantic version range');

const safePath = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine((value) => isSafeRelativePath(value), 'must be a safe relative path');

const permissionName = z
  .string()
  .trim()
  .regex(
    /^[a-z][a-z0-9]*(\.[a-z0-9][a-z0-9_-]*){0,5}$/,
    'must look like "notes.read"'
  );

const contributionId = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-_]{0,62}$/, 'must be a lowercase identifier');

export const extensionManifestSchema = z
  .object({
    manifestVersion: z.literal(EXTENSION_MANIFEST_VERSION).optional().default(EXTENSION_MANIFEST_VERSION),
    id: extensionId,
    name: z.string().trim().min(1).max(120),
    version: semverVersion,
    type: z.literal('plugin-extension'),
    description: z.string().trim().max(2000).optional().default(''),
    publisher: z
      .object({
        name: z.string().trim().min(1).max(120),
        url: z.string().trim().url().max(300).optional(),
      })
      .strict()
      .optional(),
    target: z
      .object({
        pluginId: extensionId,
        version: semverRange,
      })
      .strict(),
    compatibility: z
      .object({
        cms: semverRange,
        extensionSdk: semverRange,
      })
      .strict(),
    entry: z
      .object({
        frontend: safePath.optional(),
        backend: safePath.optional(),
        /** Public JSON under ui/ or assets/ that drives host field layout, formulas, and steps. */
        flow: safePath.optional(),
      })
      .strict()
      .optional(),
    capabilities: z.array(z.enum(EXTENSION_CAPABILITIES)).max(EXTENSION_CAPABILITIES.length).optional().default([]),
    permissions: z.array(permissionName).max(50).optional().default([]),
    dependencies: z
      .array(
        z
          .object({
            id: extensionId,
            version: semverRange,
          })
          .strict()
      )
      .max(30)
      .optional()
      .default([]),
    migrations: safePath.optional(),
    contributions: z
      .object({
        navigation: z
          .array(
            z
              .object({
                id: contributionId,
                label: z.string().trim().min(1).max(80),
                href: safePath,
              })
              .strict()
          )
          .max(50)
          .optional(),
        pages: z
          .array(
            z
              .object({
                id: contributionId,
                title: z.string().trim().min(1).max(120),
                entry: safePath,
              })
              .strict()
          )
          .max(50)
          .optional(),
        settings: z
          .array(
            z
              .object({
                key: z.string().trim().regex(/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/),
                label: z.string().trim().min(1).max(80),
                type: z.enum(['string', 'number', 'boolean', 'text']),
              })
              .strict()
          )
          .max(100)
          .optional(),
        fields: z
          .array(
            z
              .object({
                id: contributionId,
                label: z.string().trim().min(1).max(80),
                fieldType: z.string().trim().regex(/^[a-z][a-z0-9-]{0,40}$/),
              })
              .strict()
          )
          .max(100)
          .optional(),
        workflows: z
          .array(
            z
              .object({
                id: contributionId,
                label: z.string().trim().min(1).max(80),
              })
              .strict()
          )
          .max(50)
          .optional(),
        events: z
          .array(
            z
              .object({
                name: z.string().trim().regex(/^[a-z][a-z0-9._-]{0,80}$/),
              })
              .strict()
          )
          .max(50)
          .optional(),
        routes: z
          .array(
            z
              .object({
                method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
                path: z
                  .string()
                  .trim()
                  .regex(/^\/[A-Za-z0-9._/-]{0,120}$/)
                  .refine((value) => !value.includes('..'), 'must not contain ..'),
              })
              .strict()
          )
          .max(50)
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ExtensionManifest = z.infer<typeof extensionManifestSchema>;

export function duplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
