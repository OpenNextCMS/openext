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

/** GET /api/plugins/[pluginId]/data/[key] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; key: string }> }
) {
  try {
    await requireAuth();
    const { pluginId, key: rawKey } = await params;
    await requireActiveUploadedPlugin(pluginId);
    const key = assertSafeDataKey(decodeURIComponent(rawKey));

    await getUserDbConnection();
    const PluginData = getPluginDataModel();
    const row = await PluginData.findOne({ pluginId, key }).lean();
    if (!row) throw new ApiError('Key not found', 404);

    return apiOk({ key: row.key, data: row.data, updatedAt: row.updatedAt });
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/plugins/[pluginId]/data/[key] — body is the data value (or { data }). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; key: string }> }
) {
  try {
    await requireAuth();
    const { pluginId, key: rawKey } = await params;
    await requireActiveUploadedPlugin(pluginId);
    const key = assertSafeDataKey(decodeURIComponent(rawKey));

    const body = await request.json().catch(() => null);
    const data =
      body && typeof body === 'object' && 'data' in body && Object.keys(body).length === 1
        ? (body as { data: unknown }).data
        : body;

    assertPayloadSize(data);

    await getUserDbConnection();
    const PluginData = getPluginDataModel();
    const row = await PluginData.findOneAndUpdate(
      { pluginId, key },
      { $set: { data: data ?? {} } },
      { upsert: true, new: true }
    ).lean();

    return apiOk({ key: row?.key, data: row?.data });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/plugins/[pluginId]/data/[key] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; key: string }> }
) {
  try {
    await requireAuth();
    const { pluginId, key: rawKey } = await params;
    await requireActiveUploadedPlugin(pluginId);
    const key = assertSafeDataKey(decodeURIComponent(rawKey));

    await getUserDbConnection();
    const PluginData = getPluginDataModel();
    const result = await PluginData.deleteOne({ pluginId, key });
    if (result.deletedCount === 0) throw new ApiError('Key not found', 404);

    return apiOk({ deleted: true, key });
  } catch (err) {
    return handleApiError(err);
  }
}
