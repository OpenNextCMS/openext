import { NextRequest } from 'next/server';
import { getMaxPluginZipBytes } from '@/lib/plugins/uploadLimits';
import { toPublicExtension } from '@/lib/extensions/http';
import { extensionHostPagesFromRecord } from '@/lib/extensions/hostPages';
import { listExtensions, uploadExtensionPackage } from '@/lib/extensions/lifecycle';
import { readExtensions, writeExtensions } from '@/app/api/dashboard/extensions/shared';
import { ExtensionError } from '@/lib/extensions/errors';

export async function GET() {
  return readExtensions(async (services) => {
    const extensions = await listExtensions(services);
    return {
      body: {
        extensions: extensions
          .filter((extension) => extension.status !== 'uninstalled')
          .map((extension) => {
            const pub = toPublicExtension(extension);
            const pages = extensionHostPagesFromRecord(extension).map((page) => ({
              id: page.id,
              label: page.label,
              entry: page.entry,
            }));
            return { ...pub, pages, manifest: undefined, history: undefined };
          }),
      },
    };
  });
}

export async function POST(req: NextRequest) {
  return writeExtensions(async (services) => {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ExtensionError('invalid_package', 'No file uploaded.', 400);
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new ExtensionError('invalid_package', 'Only .zip extension packages are supported.', 400);
    }
    const maxPluginZipBytes = await getMaxPluginZipBytes();
    if (file.size > maxPluginZipBytes) {
      throw new ExtensionError(
        'invalid_package',
        `Extension package exceeds the ${Math.floor(maxPluginZipBytes / (1024 * 1024))}MB limit.`,
        400
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadExtensionPackage(bytes, services);
    return {
      status: uploaded.validation.installable ? 200 : 422,
      body: {
        message: uploaded.validation.installable
          ? 'Extension package staged. Review validation before installing.'
          : 'Extension package was rejected.',
        stagingId: uploaded.stagingId,
        validation: uploaded.validation,
      },
    };
  });
}
