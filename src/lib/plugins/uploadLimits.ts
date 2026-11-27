/**
 * Runtime plugin upload limits from Settings.config, with safe fallbacks.
 */
import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import {
  MAX_PLUGIN_FILES as DEFAULT_MAX_PLUGIN_FILES,
  MAX_PLUGIN_ZIP_BYTES as DEFAULT_MAX_PLUGIN_ZIP_BYTES,
} from '@/lib/plugins/storage';

export const MAX_PLUGIN_FILES_CONFIG_KEY = 'maxPluginFiles';
export const MAX_PLUGIN_ZIP_MB_CONFIG_KEY = 'maxPluginZipMb';

export const MIN_MAX_PLUGIN_FILES = 1;
export const ABSOLUTE_MAX_PLUGIN_FILES = 100_000;

export const MIN_MAX_PLUGIN_ZIP_MB = 1;
/** Hard ceiling so a misconfigured setting cannot request an unbounded upload. */
export const ABSOLUTE_MAX_PLUGIN_ZIP_MB = 1024;

function parsePositiveInt(raw: unknown, fallback: number, min: number, max: number): number {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const n = Number(digits);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(Math.floor(n), max);
}

async function readSettingsConfigValue(key: string): Promise<unknown> {
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = (await SettingsModel.findOne({}).lean().exec()) as {
    config?: Array<{ key?: string; value?: unknown }>;
  } | null;
  return settings?.config?.find((c) => c?.key === key)?.value;
}

/** Resolve max files allowed in an uploaded plugin ZIP. */
export async function getMaxPluginFiles(): Promise<number> {
  try {
    const value = await readSettingsConfigValue(MAX_PLUGIN_FILES_CONFIG_KEY);
    if (value != null && String(value).trim() !== '') {
      return parsePositiveInt(
        value,
        DEFAULT_MAX_PLUGIN_FILES,
        MIN_MAX_PLUGIN_FILES,
        ABSOLUTE_MAX_PLUGIN_FILES
      );
    }
  } catch (err) {
    console.warn('[uploadLimits] Falling back to default maxPluginFiles:', err);
  }
  return DEFAULT_MAX_PLUGIN_FILES;
}

/**
 * Resolve max compressed plugin/extension ZIP size in bytes from Settings.
 * Config key `maxPluginZipMb` is megabytes. Falls back to storage default when unset.
 */
export async function getMaxPluginZipBytes(): Promise<number> {
  const defaultMb = Math.max(
    MIN_MAX_PLUGIN_ZIP_MB,
    Math.floor(DEFAULT_MAX_PLUGIN_ZIP_BYTES / (1024 * 1024))
  );
  try {
    const value = await readSettingsConfigValue(MAX_PLUGIN_ZIP_MB_CONFIG_KEY);
    if (value != null && String(value).trim() !== '') {
      const mb = parsePositiveInt(value, defaultMb, MIN_MAX_PLUGIN_ZIP_MB, ABSOLUTE_MAX_PLUGIN_ZIP_MB);
      return mb * 1024 * 1024;
    }
  } catch (err) {
    console.warn('[uploadLimits] Falling back to default maxPluginZipMb:', err);
  }
  return DEFAULT_MAX_PLUGIN_ZIP_BYTES;
}

/** Convenience: settings megabyte value used by the admin UI. */
export async function getMaxPluginZipMb(): Promise<number> {
  return Math.max(MIN_MAX_PLUGIN_ZIP_MB, Math.floor((await getMaxPluginZipBytes()) / (1024 * 1024)));
}
