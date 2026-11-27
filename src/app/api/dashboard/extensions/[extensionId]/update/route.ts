import { NextRequest } from 'next/server';
import { getMaxPluginZipBytes } from '@/lib/plugins/uploadLimits';
import { ExtensionError } from '@/lib/extensions/errors';
import { toPublicExtension } from '@/lib/extensions/http';
import { updateExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, writeExtensions } from '@/app/api/dashboard/extensions/shared';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return writeExtensions(async (services) => {
    const extensionId = readExtensionId((await params).extensionId);
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ExtensionError('invalid_package', 'No file uploaded.', 400);
    }
    const maxPluginZipBytes = await getMaxPluginZipBytes();
    if (!file.name.toLowerCase().endsWith('.zip') || file.size > maxPluginZipBytes) {
      throw new ExtensionError(
        'invalid_package',
        `Upload a ZIP within the ${Math.floor(maxPluginZipBytes / (1024 * 1024))}MB limit.`,
        400
      );
    }
    const updated = await updateExtension(extensionId, Buffer.from(await file.arrayBuffer()), services);
    return {
      body: {
        message: 'Extension updated. Review trust and enable it again if it was stopped.',
        extension: toPublicExtension(updated.extension),
        validation: updated.validation,
      },
    };
  });
}
