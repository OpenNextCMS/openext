import { NextResponse } from 'next/server';
import { getCmsMediaStorageStatus } from '@/lib/media/imageUpload';
import { requireCapability } from '@/lib/rbac';
import { handleApiError } from '@/lib/api/response';

/**
 * Reports whether CMS image uploads currently target Amazon S3 or local disk.
 */
export async function GET() {
  try {
    await requireCapability('settings.manage');
    const status = await getCmsMediaStorageStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    return handleApiError(error);
  }
}
