import { toPublicExtension } from '@/lib/extensions/http';
import { disableExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, writeExtensions } from '@/app/api/dashboard/extensions/shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return writeExtensions(async (services) => {
    const extension = await disableExtension(readExtensionId((await params).extensionId), services);
    return {
      body: { message: 'Extension disabled. Its data was kept.', extension: toPublicExtension(extension) },
    };
  });
}
