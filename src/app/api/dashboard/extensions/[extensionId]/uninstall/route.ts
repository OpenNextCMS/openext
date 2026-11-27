import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ExtensionError } from '@/lib/extensions/errors';
import { toPublicExtension } from '@/lib/extensions/http';
import { uninstallExtension } from '@/lib/extensions/lifecycle';
import { readExtensionId, writeExtensions } from '@/app/api/dashboard/extensions/shared';

const bodySchema = z.object({ confirmDeleteData: z.boolean().optional() }).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return writeExtensions(async (services) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new ExtensionError('invalid_package', 'Uninstall request was not understood.', 400);
    }
    const extension = await uninstallExtension(
      readExtensionId((await params).extensionId),
      services,
      { confirmDeleteData: parsed.data.confirmDeleteData === true }
    );
    return {
      body: {
        message: 'Extension code removed. User tables were not dropped.',
        extension: toPublicExtension(extension),
      },
    };
  });
}
