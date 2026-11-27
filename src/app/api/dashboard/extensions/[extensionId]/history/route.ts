import { getExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, readExtensions } from '@/app/api/dashboard/extensions/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return readExtensions(async (services) => {
    const extension = await getExtension(readExtensionId((await params).extensionId), services);
    return { body: { history: extension.history } };
  });
}
