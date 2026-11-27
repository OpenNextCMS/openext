import { toPublicExtension } from '@/lib/extensions/http';
import { rollbackExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, writeExtensions } from '@/app/api/dashboard/extensions/shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return writeExtensions(async (services) => {
    const extension = await rollbackExtension(readExtensionId((await params).extensionId), services);
    return {
      body: {
        message: 'Previous version restored. Migrations from the newer version were not reversed.',
        extension: toPublicExtension(extension),
      },
    };
  });
}
