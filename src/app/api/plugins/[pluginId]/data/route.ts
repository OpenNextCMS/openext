import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { apiOk, handleApiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import {
  assertSafeDataKey,
  requireActiveUploadedPlugin,
} from '@/lib/plugins/uploaded-lifecycle';
import { getUserDbConnection, getPluginDataModel } from '@/utils/db';

const MAX_DATA_BYTES = 256 * 1024;

function assertPayloadSize(data: unknown) {
  const size = Buffer.byteLength(JSON.stringify(data ?? null), 'utf8');
  if (size > MAX_DATA_BYTES) {
    throw new ApiError(`Payload exceeds ${MAX_DATA_BYTES} byte limit`, 413);
  }
}

/** GET /api/plugins/[pluginId]/data — list all keys for this plugin. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    await requireAuth();
    const { pluginId } = await params;
    await requireActiveUploadedPlugin(pluginId);
    await getUserDbConnection();
    const PluginData = getPluginDataModel();
    const rows = await PluginData.find({ pluginId }).select('key data updatedAt').lean();
    return apiOk({
      items: rows.map((row) => ({
        key: row.key,
        data: row.data,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/plugins/[pluginId]/data — upsert { key, data }. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  try {
    await requireAuth();
    const { pluginId } = await params;
    await requireActiveUploadedPlugin(pluginId);

    const body = (await request.json().catch(() => null)) as {
      key?: string;
      data?: unknown;
    } | null;

    if (!body || typeof body.key !== 'string') {
      throw new ApiError('Body must include string "key"', 400);
    }

    const key = assertSafeDataKey(body.key);
    assertPayloadSize(body.data);

    await getUserDbConnection();
    const PluginData = getPluginDataModel();
    const row = await PluginData.findOneAndUpdate(
      { pluginId, key },
      { $set: { data: body.data ?? {} } },
      { upsert: true, new: true }
    ).lean();

    return apiOk({ key: row?.key, data: row?.data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
