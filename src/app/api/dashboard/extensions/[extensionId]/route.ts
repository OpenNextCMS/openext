import { toPublicExtension } from '@/lib/extensions/http';
import { getExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, readExtensions } from '@/app/api/dashboard/extensions/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return readExtensions(async (services) => {
    const extensionId = readExtensionId((await params).extensionId);
    const extension = await getExtension(extensionId, services);
    return { body: { extension: toPublicExtension(extension) } };
  });
}
