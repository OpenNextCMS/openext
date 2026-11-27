import fs from 'fs';
import path from 'path';
import { Schema } from 'mongoose';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

export const S3_MEDIA_PLUGIN_ID = 's3-media-plugin';

const DEFAULT_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type MediaStorageKind = 's3' | 'local';

export type UploadCmsImageResult = {
  /** Durable URL/path for storing in DB and rendering on the site. */
  filePath: string;
  /** Basename (local) or durable URL (S3) — used by siteicon consumers. */
  fileName: string;
  storage: MediaStorageKind;
  /** S3 object key when storage is s3. */
  s3Key?: string;
  /** Temporary signed URL (admin preview); do not persist. */
  viewUrl?: string;
};

export type UploadCmsImageOptions = {
  file: File;
  /** Logical folder under the S3 prefix / local public root (e.g. backgrounds, blog). */
  folder: string;
  /**
   * Local disk path under `public/` when S3 is not used.
   * Defaults to `upload/{folder}`.
   */
  localPublicDir?: string;
  /** Override allowed MIME types. */
  allowedTypes?: Set<string>;
  /** Override max file size in bytes. */
  maxBytes?: number;
  /**
   * When set, upload this buffer instead of reading `file` (e.g. sharp-processed profile).
   */
  buffer?: Buffer;
  /** MIME type when using a custom buffer. */
  bufferContentType?: string;
  /** Filename when using a custom buffer. */
  bufferFileName?: string;
};

type S3ConfigDoc = {
  bucket?: string;
  accessPointArn?: string;
  endpoint?: string;
  region?: string;
  prefix?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrlBase?: string;
};

const S3ConfigSchema = new Schema(
  {
    bucket: { type: String, default: '', trim: true },
    accessPointArn: { type: String, default: '', trim: true },
    endpoint: { type: String, default: '', trim: true },
    region: { type: String, default: 'us-east-1', trim: true },
    prefix: { type: String, default: 'nextcms-media', trim: true },
    accessKeyId: { type: String, default: '', trim: true },
    secretAccessKey: { type: String, default: '', trim: true },
    publicUrlBase: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

function safeFileName(name: string): string {
  return String(name || 'upload')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function normalizePrefix(prefix: string): string {
  return String(prefix || 'nextcms-media')
    .trim()
    .replace(/^\/+|\/+$/g, '');
}

function normalizeEndpoint(endpoint: string): string {
  const value = String(endpoint || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value.replace(/\/+$/, '');
  return `https://${value.replace(/\/+$/, '')}`;
}

function resolveBucket(config: S3ConfigDoc): string {
  const ap = String(config.accessPointArn || '').trim();
  if (ap) return ap;
  return String(config.bucket || '').trim();
}

function parseAccessPointArn(arn: string) {
  const match = String(arn || '').match(
    /^arn:aws(?:-[a-z]+)?:s3:([a-z0-9-]+):(\d{12}):accesspoint\/([a-zA-Z0-9._-]+)$/i
  );
  if (!match) return null;
  return { region: match[1], accountId: match[2], name: match[3] };
}

function buildPublicUrl(config: S3ConfigDoc, key: string): string {
  if (config.publicUrlBase) {
    return `${String(config.publicUrlBase).replace(/\/+$/, '')}/${key}`;
  }

  const ap = String(config.accessPointArn || '').trim();
  if (ap) {
    const parsed = parseAccessPointArn(ap);
    if (parsed) {
      return `https://${parsed.name}-${parsed.accountId}.s3-accesspoint.${parsed.region}.amazonaws.com/${key}`;
    }
  }

  const bucket = String(config.bucket || '').trim();
  return `https://${bucket}.s3.${config.region}.amazonaws.com/${key}`;
}

function isConfigured(config: S3ConfigDoc): boolean {
  const hasTarget = Boolean(
    String(config.bucket || '').trim() || String(config.accessPointArn || '').trim()
  );
  return Boolean(
    hasTarget &&
      String(config.region || '').trim() &&
      String(config.accessKeyId || '').trim() &&
      String(config.secretAccessKey || '').trim()
  );
}

function createS3Client(config: S3ConfigDoc): S3Client {
  const endpoint = normalizeEndpoint(config.endpoint || '');
  return new S3Client({
    region: config.region || 'us-east-1',
    credentials: {
      accessKeyId: String(config.accessKeyId),
      secretAccessKey: String(config.secretAccessKey),
    },
    useArnRegion: true,
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: false,
        }
      : {}),
  });
}

async function getS3ConfigModel() {
  const conn = await getUserDbConnection();
  const modelName = `${S3_MEDIA_PLUGIN_ID}_S3Config`;
  return conn.models[modelName] || conn.model(modelName, S3ConfigSchema);
}

/**
 * True when the S3 media plugin is installed/active and AWS connection is saved.
 */
export async function isS3MediaStorageEnabled(): Promise<boolean> {
  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugin = await PluginModel.findOne({
      pluginId: S3_MEDIA_PLUGIN_ID,
      isActive: true,
    })
      .select('pluginId isActive hasBackend')
      .lean()
      .exec();

    if (!plugin) return false;

    const S3Config = await getS3ConfigModel();
    const doc = (await S3Config.findOne({}).lean().exec()) as S3ConfigDoc | null;
    if (!doc) return false;
    return isConfigured(doc);
  } catch (error) {
    console.warn('[media] Failed to resolve S3 storage status:', error);
    return false;
  }
}

async function uploadToS3(
  options: UploadCmsImageOptions,
  buffer: Buffer,
  contentType: string,
  originalName: string
): Promise<UploadCmsImageResult> {
  const S3Config = await getS3ConfigModel();
  const doc = (await S3Config.findOne({}).lean().exec()) as S3ConfigDoc | null;
  if (!doc || !isConfigured(doc)) {
    throw new Error('S3 is not configured');
  }

  const prefix = normalizePrefix(doc.prefix || 'nextcms-media');
  const folder = String(options.folder || 'uploads')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const key = `${prefix}/${folder}/${Date.now()}-${safeFileName(originalName)}`;
  const client = createS3Client(doc);
  const bucket = resolveBucket(doc);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = buildPublicUrl(doc, key);
  let viewUrl = url;
  try {
    viewUrl = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: SIGNED_URL_TTL_SECONDS }
    );
  } catch {
    viewUrl = url;
  }

  return {
    filePath: url,
    fileName: url,
    storage: 's3',
    s3Key: key,
    viewUrl,
  };
}

function uploadToLocal(
  options: UploadCmsImageOptions,
  buffer: Buffer,
  originalName: string
): UploadCmsImageResult {
  const localDir =
    options.localPublicDir ||
    path.join('upload', String(options.folder || 'uploads').replace(/^\/+|\/+$/g, ''));
  const uploadDir = path.join(process.cwd(), 'public', localDir);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${safeFileName(originalName)}`;
  const savePath = path.join(uploadDir, fileName);
  fs.writeFileSync(savePath, buffer);

  const relativePath = `/${localDir.replace(/\\/g, '/')}/${fileName}`.replace(/\/+/g, '/');

  return {
    filePath: relativePath,
    fileName,
    storage: 'local',
  };
}

/**
 * Upload a CMS image to S3 when the S3 media plugin is active and configured.
 * When S3 mode is on, uploads NEVER fall back to local disk — failures surface
 * as errors so media always lands in Amazon S3.
 * When S3 is not configured/active, write to local `public/`.
 */
export async function uploadCmsImage(
  options: UploadCmsImageOptions
): Promise<UploadCmsImageResult> {
  const allowedTypes = options.allowedTypes ?? DEFAULT_ALLOWED_TYPES;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  const sourceName = options.bufferFileName || options.file.name;
  const contentType = options.bufferContentType || options.file.type || 'application/octet-stream';

  if (!allowedTypes.has(contentType)) {
    throw new MediaUploadError(
      `Only ${[...allowedTypes].map((t) => t.replace('image/', '').toUpperCase()).join(', ')} images are allowed`,
      400
    );
  }

  const buffer =
    options.buffer ||
    Buffer.from(await options.file.arrayBuffer());

  const size = options.buffer ? options.buffer.length : options.file.size;
  if (size > maxBytes) {
    throw new MediaUploadError(
      `Image must be smaller than ${Math.round(maxBytes / (1024 * 1024))}MB`,
      400
    );
  }

  const s3Enabled = await isS3MediaStorageEnabled();
  if (s3Enabled) {
    try {
      return await uploadToS3(options, buffer, contentType, sourceName);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload image to Amazon S3';
      console.error('[media] S3 upload failed (no local fallback):', message);
      throw new MediaUploadError(
        `S3 storage is enabled but upload failed: ${message}. Check AWS credentials, bucket/Access Point permissions, and region.`,
        502
      );
    }
  }

  return uploadToLocal(options, buffer, sourceName);
}

/**
 * Public status for Settings UI — whether CMS uploads currently target S3.
 */
export async function getCmsMediaStorageStatus(): Promise<{
  storage: MediaStorageKind;
  pluginActive: boolean;
  configured: boolean;
  message: string;
}> {
  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugin = await PluginModel.findOne({
      pluginId: S3_MEDIA_PLUGIN_ID,
      isActive: true,
    })
      .select('pluginId isActive')
      .lean()
      .exec();

    const pluginActive = Boolean(plugin);
    const S3Config = await getS3ConfigModel();
    const doc = (await S3Config.findOne({}).lean().exec()) as S3ConfigDoc | null;
    const configured = Boolean(doc && isConfigured(doc));

    if (pluginActive && configured) {
      return {
        storage: 's3',
        pluginActive,
        configured,
        message:
          'All CMS media uploads (editor, blog, site icon, profile) are stored in Amazon S3.',
      };
    }

    if (!pluginActive) {
      return {
        storage: 'local',
        pluginActive: false,
        configured,
        message:
          'S3 Media plugin is inactive. Uploads go to the local server. Activate the plugin and save AWS credentials to use S3.',
      };
    }

    return {
      storage: 'local',
      pluginActive: true,
      configured: false,
      message:
        'S3 plugin is active but credentials are incomplete. Save bucket/Access Point, region, and AWS keys to route all media to S3.',
    };
  } catch (error) {
    console.warn('[media] Failed to resolve storage status:', error);
    return {
      storage: 'local',
      pluginActive: false,
      configured: false,
      message: 'Unable to resolve S3 status. Uploads may use local disk.',
    };
  }
}

export class MediaUploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MediaUploadError';
    this.status = status;
  }
}
